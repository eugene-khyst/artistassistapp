import {readdir, readFile, stat, writeFile} from 'node:fs/promises';
import path from 'node:path';

import {po} from 'gettext-parser';
import {translate} from 'google-translate-api-x';

const SOURCE_LANG = 'en' as const;

const AVAILABLE_TARGET_LANGS = [
  'bg',
  'cs',
  'da',
  'de',
  'el',
  'es',
  'fi',
  'fr',
  'hi',
  'hu',
  'it',
  'ja',
  'ko',
  'nl',
  'nb',
  'pl',
  'pt',
  'ro',
  'sk',
  'sv',
  'tr',
  'uk',
] as const;

type SourceLang = typeof SOURCE_LANG;
type TargetLang = (typeof AVAILABLE_TARGET_LANGS)[number];

const GOOGLE_TRANSLATE_LANGS: Partial<Record<TargetLang, string>> = {
  nb: 'no',
};

type PluralForms = 'one' | 'few' | 'many' | 'other';

// CLDR plural categories per language
// Reference: https://www.unicode.org/cldr/charts/43/supplemental/language_plural_rules.html
const PLURAL_CATEGORIES: Record<TargetLang, PluralForms[]> = {
  bg: ['one', 'other'],
  cs: ['one', 'few', 'many', 'other'],
  da: ['one', 'other'],
  de: ['one', 'other'],
  el: ['one', 'other'],
  es: ['one', 'other'],
  fi: ['one', 'other'],
  fr: ['one', 'other'],
  hi: ['one', 'other'],
  hu: ['one', 'other'],
  it: ['one', 'other'],
  ja: ['other'],
  ko: ['other'],
  nl: ['one', 'other'],
  nb: ['one', 'other'],
  pl: ['one', 'few', 'many', 'other'],
  pt: ['one', 'other'],
  ro: ['one', 'few', 'other'],
  sk: ['one', 'few', 'many', 'other'],
  sv: ['one', 'other'],
  tr: ['one', 'other'],
  uk: ['one', 'few', 'many', 'other'],
};

const CATEGORY_SAMPLE_NUMBER: Record<PluralForms, number> = {
  one: 1,
  few: 3,
  many: 5,
  other: 20,
};

const PLURAL_MSGID_RE = /^\{\w+,\s*plural,/;

const LINGUI_TAG_RE = /<\/?\d+\s*\/?>/g;
const SPACED_LINGUI_TAG_RE = /\s*<\s*\/?\s*\d+\s*\/?\s*>\s*/g;
const PH_RE = /<ph>[^<]*<\/ph>/i;

async function translateText(
  sourceText: string,
  sourceLang: SourceLang,
  targetLang: TargetLang
): Promise<string | undefined> {
  const result = await translate(padLinguiTags(sourceText), {
    from: sourceLang,
    to: GOOGLE_TRANSLATE_LANGS[targetLang] ?? targetLang,
    forceBatch: true,
    autoCorrect: false,
  });
  return result.text ? restoreLinguiTags(sourceText, result.text) : undefined;
}

const canonicalLinguiTag = (tag: string) => tag.replace(/\s+/g, '');

// Google drops trailing sentences when a tag glues two of them together.
function padLinguiTags(text: string): string {
  return text.replace(SPACED_LINGUI_TAG_RE, tag => ` ${canonicalLinguiTag(tag)} `);
}

function restoreLinguiTags(original: string, translated: string): string {
  const spacing = new Map(
    (original.match(SPACED_LINGUI_TAG_RE) ?? []).map(tag => [canonicalLinguiTag(tag), tag])
  );
  const restored = translated.replace(
    SPACED_LINGUI_TAG_RE,
    tag => spacing.get(canonicalLinguiTag(tag)) ?? canonicalLinguiTag(tag)
  );

  const tagCounts = (text: string) => {
    const counts = new Map<string, number>();
    for (const tag of text.match(LINGUI_TAG_RE) ?? []) {
      const normalized = canonicalLinguiTag(tag);
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    }
    return [...counts.entries()].sort(([left], [right]) => left.localeCompare(right));
  };

  if (JSON.stringify(tagCounts(original)) !== JSON.stringify(tagCounts(restored))) {
    throw new Error(`Mismatch in Lingui tags. Original: ${original}\nTranslation: ${restored}`);
  }
  return restored;
}

function parsePluralMessage(
  ICUpluralsText: string
): {variable: string; forms: Map<string, string>} | undefined {
  const entireMatch: RegExpMatchArray | null = /^\{(\w+),\s*plural,\s*(.*)\}$/s.exec(
    ICUpluralsText
  );
  if (!entireMatch) {
    return undefined;
  }
  const variable: string = entireMatch[1]!;
  const forms = new Map<string, string>();
  const formPattern = /(\w+)\s*\{([^}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = formPattern.exec(entireMatch[2]!)) !== null) {
    // A nested placeholder would be cut off by this flat pattern.
    if (match[2]!.includes('{')) {
      throw new Error(`Nested placeholder in plural message: ${ICUpluralsText}`);
    }
    forms.set(match[1]!, match[2]!);
  }
  return forms.size > 0 ? {variable, forms} : undefined;
}

async function translatePluralMessage(
  sourceICUpluralsText: string,
  sourceLang: SourceLang,
  targetLang: TargetLang
): Promise<string | undefined> {
  const parsed = parsePluralMessage(sourceICUpluralsText);
  if (!parsed) {
    return undefined;
  }
  const {variable, forms} = parsed;
  const categories: PluralForms[] = PLURAL_CATEGORIES[targetLang];
  const translatedForms = new Map<string, string>();
  for (const category of categories) {
    const sourceCat = forms.has(category)
      ? category
      : forms.has('other')
        ? 'other'
        : [...forms.keys()][0]!;
    const sourceText = forms.get(sourceCat)!;
    const sampleNum = CATEGORY_SAMPLE_NUMBER[category];
    // Send a bare number so Google uses it for grammatical context (e.g. "5"
    // triggers Ukrainian genitive plural "кольорів" vs nominative "кольори").
    const textToTranslate = sourceText.replace('#', String(sampleNum));
    const translation = await translateText(textToTranslate, sourceLang, targetLang);
    if (!translation) {
      return undefined;
    }
    if (!sourceText.includes('#')) {
      translatedForms.set(category, translation);
      continue;
    }
    const samplePattern = new RegExp(`(?<!\\d)${sampleNum}(?!\\d)`);
    if (samplePattern.test(translation)) {
      translatedForms.set(category, translation.replace(samplePattern, '#'));
    } else {
      // Some languages absorb the number into a compound word (e.g. Finnish
      // "1 second" → "sekunnissa"). Retry with <ph> so Google treats the number
      // as an opaque HTML element and keeps it in place for # substitution.
      const textToTranslateWithPh = sourceText.replace('#', `<ph>${sampleNum}</ph>`);
      const translationWithPh = await translateText(textToTranslateWithPh, sourceLang, targetLang);
      // Google can break the <ph> tag, which would drop the number.
      if (!translationWithPh || !PH_RE.test(translationWithPh)) {
        return undefined;
      }
      translatedForms.set(category, translationWithPh.replace(PH_RE, '#'));
    }
  }
  const translatedFormsStr = [...translatedForms.entries()]
    .map(([category, translation]) => `${category} {${translation}}`)
    .join(' ');
  return `{${variable}, plural, ${translatedFormsStr}}`;
}

async function translatePoFile(
  sourceLang: SourceLang,
  targetLang: TargetLang,
  targetFilePath: string
): Promise<void> {
  console.log(`Translating ${targetFilePath} from ${sourceLang} to ${targetLang}`);
  const targetFile = await readFile(targetFilePath);
  const targetPo = po.parse(targetFile);
  const entries = targetPo.translations[''] ?? [];
  let failed = 0;

  for (const [msgid, entry] of Object.entries(entries)) {
    // skip header
    if (!msgid) {
      continue;
    }
    // skip already translated
    if (entry.msgstr[0]) {
      continue;
    }
    // Keep a failed entry empty and move on, so one bad string cannot discard the catalog.
    try {
      if (PLURAL_MSGID_RE.test(msgid)) {
        console.log(`Translating plural ${msgid} from ${sourceLang} to ${targetLang}`);
        const translated = await translatePluralMessage(msgid, sourceLang, targetLang);
        entry.msgstr[0] = translated ?? '';
      } else {
        console.log(`Translating ${msgid} from ${sourceLang} to ${targetLang}`);
        const translated = await translateText(msgid, sourceLang, targetLang);
        entry.msgstr[0] = translated ? replacePlaceholders(msgid, translated) : '';
      }
    } catch (error) {
      failed++;
      console.error(`Failed to translate ${msgid} to ${targetLang}`, error);
    }
  }

  // Lingui writes unfolded lines, so folding here would rewrite untouched entries.
  await writeFile(targetFilePath, po.compile(targetPo, {foldLength: 0}));

  if (failed) {
    process.exitCode = 1;
    console.error(`${failed} entries failed in ${targetFilePath}, rerun to retry them`);
  }
}

async function findPoFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, {withFileTypes: true});
  const files = await Promise.all(
    entries.map(entry => {
      const entryPath = path.join(directory, entry.name);
      return entry.isDirectory()
        ? findPoFiles(entryPath)
        : Promise.resolve(entry.name.endsWith('.po') ? [entryPath] : []);
    })
  );
  return files.flat().sort();
}

async function findLocalePoFiles(targetLang: TargetLang): Promise<string[]> {
  const nestedPath = path.join('src', 'locales', targetLang);
  if ((await stat(nestedPath).catch(() => undefined))?.isDirectory()) {
    return findPoFiles(nestedPath);
  }

  const flatPath = path.join('src', 'locales', `${targetLang}.po`);
  if (!(await stat(flatPath).catch(() => undefined))?.isFile()) {
    throw new Error(`PO catalog not found: ${flatPath}`);
  }
  return [flatPath];
}

async function translatePoTo(sourceLang: SourceLang, targetLang: TargetLang): Promise<void> {
  const files = await findLocalePoFiles(targetLang);
  for (const file of files) {
    await translatePoFile(sourceLang, targetLang, file);
  }
}

function getPlaceholders(text: string): string[] {
  const matches = Array.from(text.matchAll(/\{([^}]+)\}/g));
  return matches
    .map(match => match[1])
    .filter((placeholder): placeholder is string => !!placeholder);
}

function replacePlaceholders(original: string, translated: string): string {
  const originalPlaceholders = getPlaceholders(original);
  const translatedPlaceholders = getPlaceholders(translated);

  if (originalPlaceholders.length !== translatedPlaceholders.length) {
    throw new Error(
      `Mismatch in placeholder count. Original has ${originalPlaceholders.length}, but translation has ${translatedPlaceholders.length}.`
    );
  }

  if (!originalPlaceholders.length) {
    return translated;
  }

  let i = 0;
  return translated.replaceAll(/\{([^}]+)\}/g, () => `{${originalPlaceholders[i++]}}`);
}

(async () => {
  const requested = process.argv.slice(2);
  const targetLangs = (requested.length ? requested : AVAILABLE_TARGET_LANGS).map(language => {
    if (!AVAILABLE_TARGET_LANGS.includes(language as TargetLang)) {
      throw new Error(`Unsupported target language: ${language}`);
    }
    return language as TargetLang;
  });

  for (const targetLang of targetLangs) {
    await translatePoTo(SOURCE_LANG, targetLang);
  }
})().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
