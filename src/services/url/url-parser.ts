/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import type {ColorSetDefinition, ColorType} from '~/src/services/color';
import {TabKey} from '~/src/types';

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

export interface UrlParsingResult {
  colorSet?: ColorSetDefinition;
  tabKey?: TabKey;
}

export function colorSetToUrl({
  type,
  name,
  brands,
  colors,
}: ColorSetDefinition): string | undefined {
  if (!type || !brands.length || !Object.keys(colors).length) {
    return;
  }
  const url = new URL(window.location.toString());
  const {searchParams} = url;
  searchParams.set(URL_PARAM_COLOR_TYPE, type.toString(URL_PARAM_RADIX));
  searchParams.set(
    URL_PARAM_COLOR_BRANDS,
    brands.map((brand: number) => brand.toString(URL_PARAM_RADIX)).join(URL_PARAM_SEPARATOR)
  );
  Object.entries(colors).forEach(([brandIdStr, colorIds]: [string, number[]]) => {
    const brand = Number(brandIdStr);
    const ids: number[] = colorIds.map((id: number) => id - (SKU_BASE.get(brand) || 0));
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

export function parseUrl(urlStr: string): UrlParsingResult {
  const {searchParams} = new URL(urlStr);
  if (!searchParams.has(URL_PARAM_COLOR_TYPE) && !searchParams.has(URL_PARAM_TAB)) {
    return {};
  }
  const type: ColorType = parseInt(searchParams.get(URL_PARAM_COLOR_TYPE)!, URL_PARAM_RADIX);
  if (searchParams.has(URL_PARAM_COLOR_BRANDS)) {
    const brands: number[] = searchParams
      .get(URL_PARAM_COLOR_BRANDS)!
      .split(URL_PARAM_SEPARATOR)
      .map((brand: string) => parseInt(brand, URL_PARAM_RADIX));
    const colors: Record<number, number[]> = {};
    for (const brand of brands) {
      const paramColors = URL_PARAM_COLORS_PREFIX + brand;
      if (searchParams.has(paramColors)) {
        colors[brand] = searchParams
          .get(paramColors)!
          .split(URL_PARAM_SEPARATOR)
          .map((idStr: string) => {
            const id = parseInt(idStr, URL_PARAM_RADIX);
            return id + (SKU_BASE.get(brand) || 0);
          });
      }
    }
    if (!Object.keys(colors).length) {
      return {};
    }
    const name = searchParams.get(URL_PARAM_NAME);
    return {
      colorSet: {
        id: 0,
        type,
        brands,
        standardColorSet: [0],
        colors,
        ...(name ? {name} : {}),
      },
    };
  }
  if (searchParams.has(URL_PARAM_TAB)) {
    const tab: string = searchParams.get(URL_PARAM_TAB)!;
    if (Object.values(TabKey).includes(tab as TabKey)) {
      return {tabKey: tab as TabKey};
    }
  }
  return {};
}
