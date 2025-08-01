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

import type {Locale as AntdLocale} from 'antd/es/locale';
import type {StateCreator} from 'zustand';

import {loadAntdLocale, type Locale, setCurrentLocale} from '~/src/i18n';

export interface LocaleSlice {
  locale?: Locale;
  antdLocale?: AntdLocale;
  isLocaleLoading: boolean;

  setLocale: (locale: Locale, persist?: boolean) => Promise<void>;
}

export const createLocaleSlice: StateCreator<LocaleSlice, [], [], LocaleSlice> = set => ({
  isLocaleLoading: false,

  setLocale: async (locale: Locale, persist = true): Promise<void> => {
    set({
      isLocaleLoading: true,
    });
    await setCurrentLocale(locale, persist);
    const antdLocale = await loadAntdLocale(locale);
    set({
      locale,
      antdLocale,
      isLocaleLoading: false,
    });
  },
});
