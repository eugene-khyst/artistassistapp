import {defineConfig} from '@lingui/cli';

export default defineConfig({
  locales: [
    'bg',
    'cs',
    'da',
    'de',
    'el',
    'en',
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
  ],
  sourceLocale: 'en',
  catalogs: [
    {
      path: 'src/locales/{locale}',
      include: ['src'],
    },
  ],
});
