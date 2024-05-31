/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  ColorMixture,
  ColorMixtureDefinition,
  ColorMixturePart,
  ColorMixturePartDefinition,
} from '~/src/services/color';
import type {ColorSetDefinition, ColorType} from '~/src/services/color';
import {ColorBrand} from '~/src/services/color';
import type {RgbTuple} from '~/src/services/color/space';
import {Rgb} from '~/src/services/color/space';
import {TabKey} from '~/src/types';
import type {Fraction} from '~/src/utils';

const URL_PARAM_COLOR_TYPE = 't';
const URL_PARAM_COLOR_BRANDS = 'b';
const URL_PARAM_COLORS_PREFIX = 'c';
const URL_PARAM_MIXTURE_PARTS = 'm';
const URL_PARAM_MIXTURE_BACKGROUND = 'bg';
const URL_PARAM_MIXTURE_CONSISTENCY = 'cs';
const URL_PARAM_MIXTURE_NAME = 'n';
const URL_PARAM_RADIX = 36;
const URL_PARAM_SEPARATOR = '_';
const SKU_BASE = new Map<ColorBrand, number>([
  [ColorBrand.DanielSmithExtraFine, 284600000],
  [ColorBrand.DanielSmithPrimaTek, 284600000],
  [ColorBrand.GoldenQoR, 7000000],
  [ColorBrand.GoldenWilliamsburg, 6000000],
]);
const URL_PARAM_TAB = 'tab';

export interface UrlParsingResult {
  colorSet?: ColorSetDefinition;
  colorMixture?: ColorMixtureDefinition;
  tabKey?: TabKey;
}

export function colorSetToUrl({type, brands, colors}: ColorSetDefinition): string | undefined {
  if (!type || !brands || !brands.length || !Object.keys(colors).length) {
    return undefined;
  }
  const url = new URL(window.location.toString());
  const {searchParams} = url;
  searchParams.set(URL_PARAM_COLOR_TYPE, type.toString(URL_PARAM_RADIX));
  searchParams.set(
    URL_PARAM_COLOR_BRANDS,
    brands.map((brand: ColorBrand) => brand.toString(URL_PARAM_RADIX)).join(URL_PARAM_SEPARATOR)
  );
  Object.entries(colors).forEach(([key, value]: [string, number[]]) => {
    const brand = Number(key) as ColorBrand;
    const ids: number[] = value.map((id: number) => id - (SKU_BASE.get(brand) || 0));
    searchParams.set(
      URL_PARAM_COLORS_PREFIX + key,
      ids.map((id: number) => id.toString(URL_PARAM_RADIX)).join(URL_PARAM_SEPARATOR)
    );
  });
  return url.toString();
}

export function colorMixtureToUrl({
  type,
  name,
  parts,
  consistency,
  backgroundRgb,
}: ColorMixture): string | undefined {
  if (!parts.length) {
    return undefined;
  }
  const url = new URL(window.location.toString());
  const {searchParams} = url;
  searchParams.set(URL_PARAM_COLOR_TYPE, type.toString(URL_PARAM_RADIX));
  searchParams.set(
    URL_PARAM_MIXTURE_PARTS,
    parts
      .flatMap(({color: {brand, id}, part}: ColorMixturePart) => [brand, id, part])
      .map((value: number) => value.toString(URL_PARAM_RADIX))
      .join(URL_PARAM_SEPARATOR)
  );
  const [colorPart, whole] = consistency;
  searchParams.set(
    URL_PARAM_MIXTURE_CONSISTENCY,
    [colorPart, whole - colorPart]
      .map((value: number) => value.toString(URL_PARAM_RADIX))
      .join(URL_PARAM_SEPARATOR)
  );
  if (backgroundRgb) {
    searchParams.set(URL_PARAM_MIXTURE_BACKGROUND, new Rgb(...backgroundRgb).toHex(false));
  }
  if (name) {
    searchParams.set(URL_PARAM_MIXTURE_NAME, name);
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
    const brands: ColorBrand[] = searchParams
      .get(URL_PARAM_COLOR_BRANDS)!
      .split(URL_PARAM_SEPARATOR)
      .map((brand: string) => parseInt(brand, URL_PARAM_RADIX));
    const colors: Partial<Record<ColorBrand, number[]>> = {};
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
    return {
      colorSet: {
        type,
        brands,
        standardColorSet: [0],
        colors,
      },
    };
  }
  if (
    searchParams.has(URL_PARAM_MIXTURE_PARTS) &&
    searchParams.has(URL_PARAM_MIXTURE_CONSISTENCY)
  ) {
    const rawParts: string[] = searchParams
      .get(URL_PARAM_MIXTURE_PARTS)!
      .split(URL_PARAM_SEPARATOR);
    const parts: ColorMixturePartDefinition[] = [];
    for (let i = 0; i < rawParts.length; i += 3) {
      const brand: ColorBrand = parseInt(rawParts[i], URL_PARAM_RADIX);
      const id: number = parseInt(rawParts[i + 1], URL_PARAM_RADIX);
      const part: number = parseInt(rawParts[i + 2], URL_PARAM_RADIX);
      parts.push({brand, id, part});
    }
    const [colorPart, otherPart] = searchParams
      .get(URL_PARAM_MIXTURE_CONSISTENCY)!
      .split(URL_PARAM_SEPARATOR)
      .map((part: string) => parseInt(part, URL_PARAM_RADIX));
    const consistency: Fraction = [colorPart, colorPart + otherPart];
    const background: RgbTuple | null = searchParams.has(URL_PARAM_MIXTURE_BACKGROUND)
      ? Rgb.fromHex(searchParams.get(URL_PARAM_MIXTURE_BACKGROUND)!).toRgbTuple()
      : null;
    const name: string | null = searchParams.get(URL_PARAM_MIXTURE_NAME);
    return {
      colorMixture: {
        type,
        name,
        parts,
        consistency,
        background,
      },
    };
  }
  if (searchParams.has(URL_PARAM_TAB)) {
    const tab: string = searchParams.get(URL_PARAM_TAB)!;
    if (Object.values(TabKey).some((tabKey: string) => tabKey === tab)) {
      return {tabKey: tab as TabKey};
    }
  }
  return {};
}
