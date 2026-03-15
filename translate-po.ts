import {MET} from 'bing-translate-api';
import {readFile, writeFile} from 'fs/promises';
import {po} from 'gettext-parser';

const SOURCE_LANG = 'en' as const;

const TARGET_LANGS = [
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
type TargetLang = (typeof TARGET_LANGS)[number];

type PluralForms = 'one' | 'few' | 'many' | 'other';

// CLDR plural categories per language
// Reference: https://www.unicode.org/cldr/charts/43/supplemental/language_plural_rules.html
const PLURAL_CATEGORIES: Record<string, PluralForms[]> = {
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

const CATEGORY_SAMPLE_NUMBER: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  few: 3,
  many: 5,
  other: 20,
};

const PLURAL_MSGID_RE = /^\{\w+,\s*plural,/;

async function translateText(
  sourceText: string,
  sourceLang: SourceLang,
  targetLang: TargetLang
): Promise<string | undefined> {
  const result: MET.MetTranslationResult[] | undefined = await MET.translate(
    sourceText,
    sourceLang,
    targetLang,
    {
      translateOptions: {
        // @ts-expect-error -- textType is supported by MET API but missing from type definitions
        textType: 'html',
      },
    }
  );
  return result?.[0]?.translations[0]?.text;
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
  const categories: PluralForms[] = PLURAL_CATEGORIES[targetLang] ?? ['one', 'other'];
  const translatedForms = new Map<string, string>();
  for (const category of categories) {
    const sourceCat = forms.has(category)
      ? category
      : forms.has('other')
        ? 'other'
        : [...forms.keys()][0]!;
    const sourceText = forms.get(sourceCat)!;
    const sampleNum = CATEGORY_SAMPLE_NUMBER[category] ?? 2;
    // Send a bare number so Bing uses it for grammatical context (e.g. "5"
    // triggers Ukrainian genitive plural "кольорів" vs nominative "кольори").
    const textToTranslate = sourceText.replace('#', String(sampleNum));
    const translation = await translateText(textToTranslate, sourceLang, targetLang);
    if (!translation) {
      return undefined;
    }
    if (/\d/.test(translation)) {
      // Digit survived → replace it with #.
      translatedForms.set(category, translation.replace(/\d+/, '#'));
    } else {
      // Some languages absorb the number into a compound word (e.g. Finnish
      // "1 second" → "sekunnissa"). Retry with <ph> so Bing treats the number
      // as an opaque HTML element and keeps it in place for # substitution.
      const textToTranslateWithPh = sourceText.replace('#', `<ph>${sampleNum}</ph>`);
      const translationWithPh = await translateText(textToTranslateWithPh, sourceLang, targetLang);
      if (!translationWithPh) {
        return undefined;
      }
      translatedForms.set(category, translationWithPh.replace(/<ph>[^<]*<\/ph>/i, '#'));
    }
  }
  const translatedFormsStr = [...translatedForms.entries()]
    .map(([category, translation]) => `${category} {${translation}}`)
    .join(' ');
  return `{${variable}, plural, ${translatedFormsStr}}`;
}

async function translatePoTo(sourceLang: SourceLang, targetLang: TargetLang): Promise<void> {
  console.log(`Translating from ${sourceLang} to ${targetLang}`);

  const targetFilePath = `src/locales/${targetLang}.po`;
  const targetFile = await readFile(targetFilePath);
  const targetPo = po.parse(targetFile);
  const entries = targetPo.translations[''] ?? [];

  for (const [msgid, entry] of Object.entries(entries)) {
    // skip header
    if (!msgid) {
      continue;
    }
    // skip already translated
    if (entry.msgstr[0]) {
      continue;
    }
    if (PLURAL_MSGID_RE.test(msgid)) {
      console.log(`Translating plural ${msgid} from ${sourceLang} to ${targetLang}`);
      const translated = await translatePluralMessage(msgid, sourceLang, targetLang);
      entry.msgstr[0] = translated ?? '';
    } else {
      console.log(`Translating ${msgid} from ${sourceLang} to ${targetLang}`);
      const translated = await translateText(msgid, sourceLang, targetLang);
      entry.msgstr[0] = translated ? replacePlaceholders(msgid, translated) : '';
    }
  }

  await writeFile(targetFilePath, po.compile(targetPo));
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

void (async () => {
  for (const targetLang of TARGET_LANGS) {
    await translatePoTo(SOURCE_LANG, targetLang);
  }
})();
