/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  PaintBrand,
  PaintConsistency,
  PaintFraction,
  PaintFractionDefinition,
  PaintMix,
  PaintMixDefinition,
  PaintSetDefinition,
  PaintType,
} from '.';
import {Rgb, RgbTuple} from './model';

const URL_PARAM_PAINT_TYPE = 't';
const URL_PARAM_PAINT_BRANDS = 'b';
const URL_PARAM_COLORS_PREFIX = 'c';
const URL_PARAM_PAINT_MIX_FRACTIONS = 'm';
const URL_PARAM_PAINT_MIX_BACKGROUND = 'bg';
const URL_PARAM_PAINT_MIX_CONSISTENCY = 'cs';
const URL_PARAM_PAINT_MIX_NAME = 'n';
const URL_PARAM_RADIX = 36;
const URL_PARAM_SEPARATOR = '_';
const SKU_BASE = new Map<PaintBrand, number>([
  [PaintBrand.DanielSmithExtraFine, 284600000],
  [PaintBrand.DanielSmithPrimaTek, 284600000],
]);

export interface UrlParsingResult {
  paintSet?: PaintSetDefinition;
  paintMix?: PaintMixDefinition;
}

export function paintSetToUrl({type, brands, colors}: PaintSetDefinition): string | undefined {
  if (!type || !brands || !brands.length || !colors || !Object.keys(colors).length) {
    return undefined;
  }
  const url = new URL(window.location.toString());
  const {searchParams} = url;
  searchParams.set(URL_PARAM_PAINT_TYPE, type.toString(URL_PARAM_RADIX));
  searchParams.set(
    URL_PARAM_PAINT_BRANDS,
    brands.map((brand: PaintBrand) => brand.toString(URL_PARAM_RADIX)).join(URL_PARAM_SEPARATOR)
  );
  Object.entries(colors).forEach(([key, value]: [string, number[]]) => {
    const brand = Number(key) as PaintBrand;
    const ids: number[] = value.map((id: number) => id - (SKU_BASE.get(brand) || 0));
    searchParams.set(
      URL_PARAM_COLORS_PREFIX + key,
      ids.map((id: number) => id.toString(URL_PARAM_RADIX)).join(URL_PARAM_SEPARATOR)
    );
  });
  return url.toString();
}

export function paintMixToUrl({
  type,
  name,
  fractions,
  consistency,
  backgroundRgb,
}: PaintMix): string | undefined {
  if (!type || !fractions?.length || !consistency?.length) {
    return undefined;
  }
  const url = new URL(window.location.toString());
  const {searchParams} = url;
  searchParams.set(URL_PARAM_PAINT_TYPE, type.toString(URL_PARAM_RADIX));
  searchParams.set(
    URL_PARAM_PAINT_MIX_FRACTIONS,
    fractions
      .flatMap(({paint: {brand, id}, fraction}: PaintFraction) => [brand, id, fraction])
      .map((value: number) => value.toString(URL_PARAM_RADIX))
      .join(URL_PARAM_SEPARATOR)
  );
  searchParams.set(
    URL_PARAM_PAINT_MIX_CONSISTENCY,
    consistency.map((value: number) => value.toString(URL_PARAM_RADIX)).join(URL_PARAM_SEPARATOR)
  );
  if (backgroundRgb) {
    searchParams.set(URL_PARAM_PAINT_MIX_BACKGROUND, new Rgb(...backgroundRgb).toHex(false));
  }
  if (name) {
    searchParams.set(URL_PARAM_PAINT_MIX_NAME, name);
  }
  return url.toString();
}

export function parseUrl(urlStr: string): UrlParsingResult {
  const {searchParams} = new URL(urlStr);
  if (!searchParams.has(URL_PARAM_PAINT_TYPE)) {
    return {};
  }
  const type: PaintType = parseInt(searchParams.get(URL_PARAM_PAINT_TYPE)!, URL_PARAM_RADIX);
  if (searchParams.has(URL_PARAM_PAINT_BRANDS)) {
    const brands: PaintBrand[] = searchParams
      .get(URL_PARAM_PAINT_BRANDS)!
      .split(URL_PARAM_SEPARATOR)
      .map((brand: string) => parseInt(brand, URL_PARAM_RADIX));
    const colors: Partial<Record<PaintBrand, number[]>> = {};
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
      paintSet: {
        type,
        brands,
        storeBoughtPaintSet: [0],
        colors,
      },
    };
  }
  if (
    searchParams.has(URL_PARAM_PAINT_MIX_FRACTIONS) &&
    searchParams.has(URL_PARAM_PAINT_MIX_CONSISTENCY)
  ) {
    const fractionsParts: string[] = searchParams
      .get(URL_PARAM_PAINT_MIX_FRACTIONS)!
      .split(URL_PARAM_SEPARATOR);
    const fractions: PaintFractionDefinition[] = [];
    for (let i = 0; i < fractionsParts.length; i += 3) {
      const brand: PaintBrand = parseInt(fractionsParts[i], URL_PARAM_RADIX);
      const id: number = parseInt(fractionsParts[i + 1], URL_PARAM_RADIX);
      const fraction: number = parseInt(fractionsParts[i + 2], URL_PARAM_RADIX);
      fractions.push({brand, id, fraction});
    }
    const [paintFraction, fluidFraction] = searchParams
      .get(URL_PARAM_PAINT_MIX_CONSISTENCY)!
      .split(URL_PARAM_SEPARATOR)
      .map((fraction: string) => parseInt(fraction, URL_PARAM_RADIX));
    const consistency: PaintConsistency = [paintFraction, fluidFraction];
    const background: RgbTuple | null = searchParams.has(URL_PARAM_PAINT_MIX_BACKGROUND)
      ? Rgb.fromHex(searchParams.get(URL_PARAM_PAINT_MIX_BACKGROUND)!).toRgbTuple()
      : null;
    const name: string | null = searchParams.get(URL_PARAM_PAINT_MIX_NAME);
    return {
      paintMix: {
        type,
        name,
        fractions,
        consistency,
        background,
      },
    };
  }
  return {};
}
