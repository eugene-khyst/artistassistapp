/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {apiUrl} from '~/src/config';
import {fetchAndCache} from '~/src/utils';

import {Rgb, type RgbTuple} from './space';

export enum ColorType {
  WatercolorPaint = 1,
  OilPaint = 2,
  AcrylicPaint = 3,
  ColoredPencils = 4,
  WatercolorPencils = 5,
  Gouache = 6,
  AcrylicGouache = 7,
}

export enum ColorOpacity {
  Transparent = 1,
  SemiTransparent = 2,
  SemiOpaque = 3,
  Opaque = 4,
}

export interface ColorTypeDefinition {
  alias: string;
  name: string;
}

export interface ColorIdFormat {
  show?: boolean;
  prefix?: string;
  padLength?: number;
  splitAt?: number;
}

export interface ColorBrandDefinition {
  id: number;
  alias: string;
  fullName: string;
  shortName?: string;
  idFormat?: ColorIdFormat;
}

export interface StandardColorSetDefinition {
  name: string;
  colors: number[];
}

export interface ColorDefinition {
  id: number;
  name: string;
  hex: string;
  rho: number[];
  opacity?: number;
}

export interface ColorSetDefinition {
  id?: number;
  type?: ColorType;
  name?: string;
  brands: number[];
  standardColorSet?: [0] | [number, string];
  colors: Record<number, number[]>;
  date?: Date;
}

export interface Color {
  brand: number;
  id: number;
  name: string;
  rgb: RgbTuple;
  rho: number[];
  opacity?: ColorOpacity;
}

export interface ColorSet {
  id: number;
  type: ColorType;
  brands: Map<number, ColorBrandDefinition>;
  colors: Color[];
}

export const COLOR_TYPES = new Map<ColorType, ColorTypeDefinition>([
  [ColorType.WatercolorPaint, {name: 'Watercolor paint', alias: 'watercolor-paint'}],
  [ColorType.Gouache, {name: 'Gouache', alias: 'gouache'}],
  [ColorType.AcrylicGouache, {name: 'Acrylic gouache', alias: 'acrylic-gouache'}],
  [ColorType.AcrylicPaint, {name: 'Acrylic paint', alias: 'acrylic-paint'}],
  [ColorType.OilPaint, {name: 'Oil paint', alias: 'oil-paint'}],
  [ColorType.ColoredPencils, {name: 'Colored pencils', alias: 'colored-pencils'}],
  [ColorType.WatercolorPencils, {name: 'Watercolor pencils', alias: 'watercolor-pencils'}],
]);

export const compareColorBrandsByName = (
  {fullName: a}: ColorBrandDefinition,
  {fullName: b}: ColorBrandDefinition
) => a.localeCompare(b);

export const compareColorSetsByDate = (
  {date: a}: ColorSetDefinition,
  {date: b}: ColorSetDefinition
) => (a?.getTime() ?? 0) - (b?.getTime() ?? 0);

function getResourceUrl(
  resource: 'brands' | 'colors' | 'sets',
  type: ColorType,
  brandAlias?: string
): string {
  const medium: string = COLOR_TYPES.get(type)!.alias;
  if (resource === 'brands') {
    return `${apiUrl}/${medium}/${resource}.json`;
  } else {
    return `${apiUrl}/${medium}/${brandAlias}/${resource}.json`;
  }
}

export async function fetchColorBrands(
  type: ColorType
): Promise<Map<number, ColorBrandDefinition>> {
  const url = getResourceUrl('brands', type);
  const response = await fetchAndCache(url);
  const brands = (await response.json()) as ColorBrandDefinition[];
  return new Map(brands.map((brand: ColorBrandDefinition) => [brand.id, brand]));
}

export async function fetchStandardColorSets(
  type: ColorType,
  brandAlias: string
): Promise<Map<string, StandardColorSetDefinition>> {
  const url = getResourceUrl('sets', type, brandAlias);
  const response = await fetchAndCache(url);
  const sets = (await response.json()) as StandardColorSetDefinition[];
  return new Map(
    sets.map((standardColorSet: StandardColorSetDefinition) => [
      standardColorSet.name,
      standardColorSet,
    ])
  );
}

export async function fetchColors(
  type: ColorType,
  brandAlias: string
): Promise<Map<number, ColorDefinition>> {
  const url = getResourceUrl('colors', type, brandAlias);
  const response = await fetchAndCache(url);
  const colors = (await response.json()) as ColorDefinition[];
  return new Map(colors.map((color: ColorDefinition) => [color.id, color]));
}

export async function fetchColorsBulk(
  type: ColorType,
  brandAliases: string[]
): Promise<Map<string, Map<number, ColorDefinition>>> {
  return new Map(
    await Promise.all(
      brandAliases.map(
        async (brandAlias: string): Promise<[string, Map<number, ColorDefinition>]> => [
          brandAlias,
          await fetchColors(type, brandAlias),
        ]
      )
    )
  );
}

export function formatColorLabel(
  {id, name}: ColorDefinition | Color,
  {idFormat = {}}: ColorBrandDefinition
): string {
  const {show, prefix, padLength, splitAt}: ColorIdFormat = {
    show: true,
    ...idFormat,
  };
  let idStr = '';
  if (show) {
    idStr = `${prefix ? prefix : ''}${padLength ? String(id).padStart(padLength, '0') : id}`;
    if (splitAt && idStr.length > splitAt) {
      idStr = `${idStr.substring(0, splitAt)}-${idStr.substring(splitAt)}`;
    }
  }
  return `${idStr} ${name}`;
}

export function toColorSet(
  {id, type, colors: selectedColors}: ColorSetDefinition,
  brands?: Map<number, ColorBrandDefinition>,
  colors?: Map<string, Map<number, ColorDefinition>>
): ColorSet | undefined {
  if (!id || !type || !Object.entries(selectedColors).length || !brands || !colors) {
    return;
  }
  return {
    id,
    type,
    brands,
    colors: Object.entries(selectedColors).flatMap(
      ([brandIdStr, colorIds]: [string, number[]]): Color[] => {
        const brandId = Number(brandIdStr);
        const brandAlias: string | undefined = brands.get(brandId)?.alias;
        if (!brandAlias) {
          return [];
        }
        return colorIds
          .map((colorId: number): ColorDefinition | undefined =>
            colors?.get(brandAlias)?.get(colorId)
          )
          .filter((color): color is ColorDefinition => !!color)
          .map(
            ({id, name, hex, rho, opacity}: ColorDefinition): Color => ({
              brand: brandId,
              id,
              name,
              rgb: Rgb.fromHex(hex).toRgbTuple(),
              rho,
              opacity,
            })
          );
      }
    ),
  };
}
