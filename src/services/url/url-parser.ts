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
  ColorType,
  CUSTOM_COLOR_SET,
} from '@eugene-khyst/artistassistapp-color-mixer';

import {AuthError} from '@/services/auth/errors';
import {CloudError} from '@/services/cloud/errors';
import {isTabKey, type TabKey} from '@/tabs';

export interface UrlParsingResult {
  loginCallback?: {
    completionToken: string | null;
  };
  loggedOut?: {
    error: AuthError | null;
  };
  cloudCallback?: {
    completed: boolean;
    error: CloudError | AuthError | null;
  };
  install?: boolean;
  tabKey?: TabKey;
  colorSet?: ColorSetDefinition;
}

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
const URL_PARAM_ERROR = 'error';
const COLOR_TYPE_VALUES = new Set<number>(
  Object.values(ColorType).filter((value): value is number => typeof value === 'number')
);

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
    const brand = Number(brandIdStr);
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

function parseTab(url: URL): UrlParsingResult | undefined {
  const slug: string = url.pathname.replaceAll(/^\/|\/$/g, '');
  if (slug === 'install') {
    return {
      install: true,
    };
  }
  if (isTabKey(slug)) {
    return {
      tabKey: slug,
    };
  }
  return;
}

function parseColorSet(searchParams: URLSearchParams): UrlParsingResult | undefined {
  if (!searchParams.has(URL_PARAM_COLOR_TYPE) || !searchParams.has(URL_PARAM_COLOR_BRANDS)) {
    return;
  }
  const type = parseUrlInteger(searchParams.get(URL_PARAM_COLOR_TYPE));
  if (type === undefined || !COLOR_TYPE_VALUES.has(type)) {
    return;
  }
  const parsedBrands = searchParams
    .get(URL_PARAM_COLOR_BRANDS)!
    .split(URL_PARAM_SEPARATOR)
    .map(parseUrlInteger);
  if (parsedBrands.includes(undefined)) {
    return;
  }
  const brands = parsedBrands.filter((brand): brand is number => brand !== undefined);
  const colors: Record<number, number[]> = {};
  for (const brand of brands) {
    const paramColors = `${URL_PARAM_COLORS_PREFIX}${brand}`;
    if (searchParams.has(paramColors)) {
      const parsedIds = searchParams
        .get(paramColors)!
        .split(URL_PARAM_SEPARATOR)
        .map(parseUrlInteger);
      if (parsedIds.includes(undefined)) {
        return;
      }
      const ids = parsedIds.filter((id): id is number => id !== undefined);
      colors[brand] = ids.map(id => id + (SKU_BASE.get(brand) ?? 0));
    }
  }
  if (!Object.keys(colors).length) {
    return;
  }
  const name = searchParams.get(URL_PARAM_NAME);
  return {
    colorSet: {
      type,
      brands,
      standardColorSet: CUSTOM_COLOR_SET,
      colors,
      ...(name ? {name} : {}),
    },
  };
}

function parseUrlInteger(value: string | null): number | undefined {
  if (!value || !/^[\da-z]+$/i.test(value)) {
    return;
  }
  const parsed = Number.parseInt(value, URL_PARAM_RADIX);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function parseLoginCallback(url: URL): UrlParsingResult | undefined {
  if (url.pathname !== '/login/callback') {
    return;
  }
  return {
    loginCallback: {
      completionToken: url.searchParams.get('completion_token'),
    },
  };
}

function parseLoggedOut(url: URL): UrlParsingResult | undefined {
  if (url.pathname !== '/logged-out') {
    return;
  }
  const {searchParams} = url;
  return {
    loggedOut: {
      error: searchParams.has(URL_PARAM_ERROR)
        ? AuthError.fromErrorType(
            searchParams.get(URL_PARAM_ERROR),
            'Logged out due to an authentication error'
          )
        : null,
    },
  };
}

function parseCloudCallback(url: URL): UrlParsingResult | undefined {
  if (url.pathname !== '/cloud/callback') {
    return;
  }
  const {searchParams} = url;
  return {
    cloudCallback: {
      completed: searchParams.get('completed')?.toLowerCase() === 'true',
      error: searchParams.has(URL_PARAM_ERROR)
        ? CloudError.fromErrorType(searchParams.get(URL_PARAM_ERROR), 'Cloud connection failed')
        : null,
    },
  };
}

export function parseUrl(urlStr: string): UrlParsingResult {
  const url = new URL(urlStr);
  return (
    parseLoginCallback(url) ??
    parseLoggedOut(url) ??
    parseCloudCallback(url) ??
    parseTab(url) ??
    parseColorSet(url.searchParams) ??
    {}
  );
}
