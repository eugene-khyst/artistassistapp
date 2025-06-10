import type {LinguiConfig} from '@lingui/conf';

const config: LinguiConfig = {
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
};

export default config;
