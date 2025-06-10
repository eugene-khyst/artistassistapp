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

async function translateText(
  sourceText: string,
  sourceLang: SourceLang,
  targetLang: TargetLang
): Promise<string | undefined> {
  const result = await MET.translate(sourceText, sourceLang, targetLang, {
    translateOptions: {
      // @ts-expect-error
      textType: 'html',
    },
  });
  return result?.[0]?.translations?.[0]?.text;
}

async function translatePoTo(sourceLang: SourceLang, targetLang: TargetLang): Promise<void> {
  console.log(`Translating from ${sourceLang} to ${targetLang}`);

  const targetFilePath = `src/locales/${targetLang}.po`;
  var targetFile = await readFile(targetFilePath);
  const targetPo = po.parse(targetFile);
  const entries = targetPo.translations[''] ?? [];

  for (const [msgid, entry] of Object.entries(entries)) {
    if (!msgid) {
      // skip header
      continue;
    }
    // skip translated
    if (entry.msgstr[0]) {
      continue;
    }
    console.log(`Translating ${msgid} from ${sourceLang} to ${targetLang}`);
    const translated = await translateText(msgid, sourceLang, targetLang);
    entry.msgstr[0] = translated ? replacePlaceholders(msgid, translated) : '';
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
  return translated.replace(/\{([^}]+)\}/g, () => `{${originalPlaceholders[i++]}}`);
}

(async () => {
  for (const targetLang of TARGET_LANGS) {
    await translatePoTo(SOURCE_LANG, targetLang);
  }
})();
