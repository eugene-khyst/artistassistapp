/**
 * ArtistAssistApp
 * Copyright (C) 2023-2025  Eugene Khyst
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import type {Messages} from '@lingui/core';
import {i18n} from '@lingui/core';
import type {Locale as AntdLocale} from 'antd/es/locale';

import {mergeAlternating} from '~/src/utils/array';

const LOCALES = [
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
] as const;

const DEFAULT_LOCALE = 'en';

export type Locale = (typeof LOCALES)[number];

const LOCALE_KEY = 'locale';

function getPreferredLocale(): Locale | undefined {
  const locales: string[] = (
    navigator.languages.length ? navigator.languages : [navigator.language]
  ).filter(Boolean);
  const langs: string[] = locales
    .map((locale: string) => locale.split('-')[0]?.toLowerCase())
    .filter((lang): lang is string => !!lang);
  return mergeAlternating(locales, langs).find((locale): locale is Locale =>
    LOCALES.includes(locale as Locale)
  );
}

export function getCurrentLocale(): Locale {
  const locale: string | null = localStorage.getItem(LOCALE_KEY);
  return (locale as Locale | null) ?? getPreferredLocale() ?? DEFAULT_LOCALE;
}

export async function setCurrentLocale(locale: Locale, persist: boolean) {
  await loadMessageCatalog(locale);
  if (persist) {
    localStorage.setItem(LOCALE_KEY, locale);
  }
}

export async function loadMessageCatalog(locale: Locale) {
  const {messages} = (await import(`./locales/${locale}.po`)) as {messages: Messages};
  i18n.loadAndActivate({locale, messages});
}

export async function loadAntdLocale(locale: Locale): Promise<AntdLocale> {
  switch (locale) {
    case 'bg':
      return (await import('antd/locale/bg_BG')).default;
    case 'cs':
      return (await import('antd/locale/cs_CZ')).default;
    case 'da':
      return (await import('antd/locale/da_DK')).default;
    case 'de':
      return (await import('antd/locale/de_DE')).default;
    case 'el':
      return (await import('antd/locale/el_GR')).default;
    case 'en':
      return (await import('antd/locale/en_US')).default;
    case 'es':
      return (await import('antd/locale/es_ES')).default;
    case 'fi':
      return (await import('antd/locale/fi_FI')).default;
    case 'fr':
      return (await import('antd/locale/fr_FR')).default;
    case 'hi':
      return (await import('antd/locale/hi_IN')).default;
    case 'hu':
      return (await import('antd/locale/hu_HU')).default;
    case 'it':
      return (await import('antd/locale/it_IT')).default;
    case 'ja':
      return (await import('antd/locale/ja_JP')).default;
    case 'ko':
      return (await import('antd/locale/ko_KR')).default;
    case 'nl':
      return (await import('antd/locale/nl_NL')).default;
    case 'nb':
      return (await import('antd/locale/nb_NO')).default;
    case 'pl':
      return (await import('antd/locale/pl_PL')).default;
    case 'pt':
      return (await import('antd/locale/pt_PT')).default;
    case 'ro':
      return (await import('antd/locale/ro_RO')).default;
    case 'sk':
      return (await import('antd/locale/sk_SK')).default;
    case 'sv':
      return (await import('antd/locale/sv_SE')).default;
    case 'tr':
      return (await import('antd/locale/tr_TR')).default;
    case 'uk':
      return (await import('antd/locale/uk_UA')).default;
    default:
      return (await import('antd/locale/en_US')).default;
  }
}
