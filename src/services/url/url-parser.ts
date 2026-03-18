/**
 * ArtistAssistApp
 * Copyright (C) 2023-2026  Eugene Khyst
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

import {
  type ColorSetDefinition,
  type ColorType,
  CUSTOM_COLOR_SET,
  NEW_COLOR_SET,
} from '~/src/services/color/types';
import type {UrlParsingResult} from '~/src/services/url/types';
import {TabKey} from '~/src/tabs';
import {replaceHistory} from '~/src/utils/history';

const URL_PARAM_COLOR_TYPE = 't';
const URL_PARAM_COLOR_BRANDS = 'b';
const URL_PARAM_COLORS_PREFIX = 'c';
const URL_PARAM_NAME = 'n';
const URL_PARAM_RADIX = 36;
const URL_PARAM_SEPARATOR = '_';
const SKU_BASE = new Map<number, number>([
  [3, 284600000], //daniel-smith-extra-fine
  [14, 284600000], //daniel-smith-primatek
  [44, 7000000], //golden-qor
  [45, 6000000], //golden-williamsburg
]);
const URL_PARAM_TAB = 'tab';
const TAB_KEY_VALUES = new Set<string>(Object.values(TabKey));
const LOGIN_PATHNAME = '/login';

export function colorSetToUrl({
  type,
  name,
  brands,
  colors,
}: ColorSetDefinition): string | undefined {
  if (!type || !brands?.length || !colors || !Object.keys(colors).length) {
    return;
  }
  const url = new URL(window.location.origin);
  const {searchParams} = url;
  searchParams.set(URL_PARAM_COLOR_TYPE, type.toString(URL_PARAM_RADIX));
  searchParams.set(
    URL_PARAM_COLOR_BRANDS,
    brands.map((brand: number) => brand.toString(URL_PARAM_RADIX)).join(URL_PARAM_SEPARATOR)
  );
  Object.entries(colors).forEach(([brandIdStr, colorIds]: [string, number[]]) => {
    const brand = Number.parseInt(brandIdStr);
    const ids: number[] = colorIds.map((id: number) => id - (SKU_BASE.get(brand) ?? 0));
    searchParams.set(
      URL_PARAM_COLORS_PREFIX + brandIdStr,
      ids.map((id: number) => id.toString(URL_PARAM_RADIX)).join(URL_PARAM_SEPARATOR)
    );
  });
  if (name) {
    searchParams.set(URL_PARAM_NAME, name);
  }
  return url.toString();
}

function parseTabFromPathname(url: URL): TabKey | undefined {
  const slug: string = url.pathname.replace(/^\/|\/$/g, '');
  if (slug && TAB_KEY_VALUES.has(slug)) {
    return slug as TabKey;
  }
  return undefined;
}

function parseTabFromSearchParams(searchParams: URLSearchParams): TabKey | undefined {
  const tab: string | null = searchParams.get(URL_PARAM_TAB);
  if (tab && TAB_KEY_VALUES.has(tab)) {
    return tab as TabKey;
  }
  return undefined;
}

function parseColorSetFromSearchParams(
  searchParams: URLSearchParams
): ColorSetDefinition | undefined {
  if (!searchParams.has(URL_PARAM_COLOR_TYPE) || !searchParams.has(URL_PARAM_COLOR_BRANDS)) {
    return undefined;
  }
  const type: ColorType = Number.parseInt(searchParams.get(URL_PARAM_COLOR_TYPE)!, URL_PARAM_RADIX);
  const brands: number[] = searchParams
    .get(URL_PARAM_COLOR_BRANDS)!
    .split(URL_PARAM_SEPARATOR)
    .map((brand: string) => Number.parseInt(brand, URL_PARAM_RADIX));
  const colors: Record<number, number[]> = {};
  for (const brand of brands) {
    const paramColors = `${URL_PARAM_COLORS_PREFIX}${brand}`;
    if (searchParams.has(paramColors)) {
      colors[brand] = searchParams
        .get(paramColors)!
        .split(URL_PARAM_SEPARATOR)
        .map((idStr: string) => {
          const id = Number.parseInt(idStr, URL_PARAM_RADIX);
          return id + (SKU_BASE.get(brand) ?? 0);
        });
    }
  }
  if (!Object.keys(colors).length) {
    return undefined;
  }
  const name = searchParams.get(URL_PARAM_NAME);
  return {
    id: NEW_COLOR_SET,
    type,
    brands,
    standardColorSet: CUSTOM_COLOR_SET,
    colors,
    ...(name ? {name} : {}),
  };
}

export function parseUrl(urlStr: string): UrlParsingResult {
  const url = new URL(urlStr);
  if (url.pathname === LOGIN_PATHNAME) {
    return {login: true};
  }
  const tabKey: TabKey | undefined =
    parseTabFromPathname(url) ?? parseTabFromSearchParams(url.searchParams);
  if (tabKey) {
    return {tabKey};
  }
  const colorSet: ColorSetDefinition | undefined = parseColorSetFromSearchParams(url.searchParams);
  if (colorSet) {
    return {colorSet};
  }
  return {};
}

export function importFromUrl(): UrlParsingResult {
  const importedFromUrl: UrlParsingResult = parseUrl(window.location.toString());
  const {colorSet, tabKey, login} = importedFromUrl;
  if (colorSet || tabKey || login) {
    replaceHistory();
  }
  return importedFromUrl;
}
