/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {PaintBrand, PaintSetDefinition, PaintType} from '.';

const URL_PARAM_PAINT_TYPE = 't';
const URL_PARAM_PAINT_BRANDS = 'b';
const URL_PARAM_COLORS_PREFIX = 'c';
const URL_PARAM_RADIX = 36;
const URL_PARAM_SEPARATOR = '_';
const DANIEL_SMITH_SKU_BASE = 284600000;

export function paintSetToUrl({type, brands, colors}: PaintSetDefinition): string | undefined {
  if (!type || !brands || !brands.length || !colors || !Object.keys(colors).length) {
    return undefined;
  }
  const url = new URL(window.location.toString());
  const {searchParams} = url;
  searchParams.set(URL_PARAM_PAINT_TYPE, type!.toString(URL_PARAM_RADIX));
  searchParams.set(
    URL_PARAM_PAINT_BRANDS,
    brands.map((brand: PaintBrand) => brand.toString(URL_PARAM_RADIX)).join(URL_PARAM_SEPARATOR)
  );
  Object.entries(colors).forEach(([key, value]: [string, number[]]) => {
    const brand = Number(key) as PaintBrand;
    let ids: number[] = value;
    if (brand === PaintBrand.DanielSmithExtraFine || brand === PaintBrand.DanielSmithPrimaTek) {
      ids = value.map((id: number) => id - DANIEL_SMITH_SKU_BASE);
    }
    searchParams.set(
      URL_PARAM_COLORS_PREFIX + key,
      ids.map((id: number) => id.toString(URL_PARAM_RADIX)).join(URL_PARAM_SEPARATOR)
    );
  });
  return url.toString();
}

export function paintSetFromUrl(urlStr: string): PaintSetDefinition | undefined {
  const {searchParams} = new URL(urlStr);
  if (!searchParams.has(URL_PARAM_PAINT_TYPE)) {
    return undefined;
  }
  if (!searchParams.has(URL_PARAM_PAINT_BRANDS)) {
    return undefined;
  }
  const type: PaintType = parseInt(searchParams.get(URL_PARAM_PAINT_TYPE)!, URL_PARAM_RADIX);
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
          if (
            brand === PaintBrand.DanielSmithExtraFine ||
            brand === PaintBrand.DanielSmithPrimaTek
          ) {
            return id + DANIEL_SMITH_SKU_BASE;
          }
          return id;
        });
    }
  }
  if (!Object.keys(colors).length) {
    return undefined;
  }
  return {
    type,
    brands,
    storeBoughtPaintSet: [0],
    colors,
  };
}
