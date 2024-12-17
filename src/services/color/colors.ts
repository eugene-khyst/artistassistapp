/**
 * ArtistAssistApp
 * Copyright (C) 2023-2024  Eugene Khyst
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

import {API_URL} from '~/src/config';
import type {User} from '~/src/services/auth';
import type {
  Color,
  ColorBrandDefinition,
  ColorDefinition,
  ColorIdFormat,
  ColorSet,
  ColorSetDefinition,
  ColorTypeDefinition,
  CustomColorBrandDefinition,
  StandardColorSetDefinition,
} from '~/src/services/color/types';
import {ColorType} from '~/src/services/color/types';
import {getCustomColorBrand, getCustomColorBrandsByType} from '~/src/services/db/custom-brand-db';
import {fetchSWR} from '~/src/utils';

import {Rgb} from './space';

export const COLOR_TYPES = new Map<ColorType, ColorTypeDefinition>([
  [ColorType.WatercolorPaint, {name: 'Watercolor paint', alias: 'watercolor-paint'}],
  [ColorType.Gouache, {name: 'Gouache', alias: 'gouache'}],
  [ColorType.AcrylicPaint, {name: 'Acrylic paint', alias: 'acrylic-paint'}],
  [ColorType.AcrylicGouache, {name: 'Acrylic gouache', alias: 'acrylic-gouache'}],
  [ColorType.OilPaint, {name: 'Oil paint', alias: 'oil-paint'}],
  [ColorType.ColoredPencils, {name: 'Colored pencils', alias: 'colored-pencils'}],
  [ColorType.WatercolorPencils, {name: 'Watercolor pencils', alias: 'watercolor-pencils'}],
  [ColorType.Pastel, {name: 'Pastel', alias: 'pastel'}],
  [ColorType.OilPastel, {name: 'Oil pastel', alias: 'oil-pastel'}],
  [ColorType.AcrylicMarkers, {name: 'Acrylic Markers', alias: 'acrylic-markers'}],
]);

const CUSTOM_COLOR_BRAND_ID_BASE = 100000;
const CUSTOM_COLOR_BRAND_ALIAS_PREFIX = 'custom:';

function toColorBrandDefinition({
  id = 0,
  name = '',
}: CustomColorBrandDefinition): ColorBrandDefinition {
  return {
    id: CUSTOM_COLOR_BRAND_ID_BASE + id,
    alias: `${CUSTOM_COLOR_BRAND_ALIAS_PREFIX}${id}`,
    fullName: name,
    freeTier: false,
  };
}

function isCustomColorBrandAlias(alias: string): boolean {
  return alias.startsWith(CUSTOM_COLOR_BRAND_ALIAS_PREFIX);
}

function getCustomColorBrandIdFromAlias(alias: string): number {
  return parseInt(alias.replace(CUSTOM_COLOR_BRAND_ALIAS_PREFIX, ''));
}

export const compareColorBrandsByName = (
  {fullName: a}: ColorBrandDefinition,
  {fullName: b}: ColorBrandDefinition
) => a.localeCompare(b);

export const compareColorBrandsByFreeTierAndName = (
  a: ColorBrandDefinition,
  b: ColorBrandDefinition
) =>
  (a.freeTier ?? false) === (b.freeTier ?? false)
    ? compareColorBrandsByName(a, b)
    : a.freeTier
      ? -1
      : 1;

export const compareByDate = (
  {date: a}: ColorSetDefinition | CustomColorBrandDefinition,
  {date: b}: ColorSetDefinition | CustomColorBrandDefinition
) => (a?.getTime() ?? 0) - (b?.getTime() ?? 0);

function getResourceUrl(
  resource: 'brands' | 'colors' | 'sets',
  type: ColorType,
  brandAlias?: string
): string {
  const medium: string = COLOR_TYPES.get(type)!.alias;
  if (resource === 'brands') {
    return `${API_URL}/${medium}/${resource}.json`;
  } else {
    return `${API_URL}/${medium}/${brandAlias}/${resource}.json`;
  }
}

export async function fetchColorBrands(
  type: ColorType
): Promise<Map<number, ColorBrandDefinition>> {
  const url = getResourceUrl('brands', type);
  const response = await fetchSWR(url);
  const brands = (await response.json()) as ColorBrandDefinition[];
  const customBrands = (await getCustomColorBrandsByType(type)).map(toColorBrandDefinition);
  return new Map(
    [...brands, ...customBrands].map((brand: ColorBrandDefinition) => [brand.id, brand])
  );
}

export async function fetchStandardColorSets(
  type: ColorType,
  brandAlias: string
): Promise<Map<string, StandardColorSetDefinition>> {
  let sets: StandardColorSetDefinition[] = [];
  if (!isCustomColorBrandAlias(brandAlias)) {
    const url = getResourceUrl('sets', type, brandAlias);
    const response = await fetchSWR(url);
    sets = (await response.json()) as StandardColorSetDefinition[];
  }
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
  let colors: ColorDefinition[] = [];
  if (isCustomColorBrandAlias(brandAlias)) {
    colors = ((await getCustomColorBrand(getCustomColorBrandIdFromAlias(brandAlias)))?.colors ??
      []) as ColorDefinition[];
  } else {
    const url = getResourceUrl('colors', type, brandAlias);
    const response = await fetchSWR(url);
    colors = (await response.json()) as ColorDefinition[];
  }
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
  const {
    show,
    prefix,
    suffix,
    padLength,
    splitAt,
    delimiter = '-',
  }: ColorIdFormat = {
    show: true,
    ...idFormat,
  };
  if (show) {
    let idStr = `${prefix ?? ''}${padLength ? String(id).padStart(padLength, '0') : id}${suffix ?? ''}`;
    if (splitAt && idStr.length > splitAt) {
      idStr = `${idStr.substring(0, splitAt)}${delimiter}${idStr.substring(splitAt)}`;
    }
    return `${idStr} ${name}`;
  } else {
    return name;
  }
}

export function toColorSet(
  user: User | null,
  {id, type, brands: selectedBrands, colors: selectedColors}: ColorSetDefinition,
  brands?: Map<number, ColorBrandDefinition>,
  colors?: Map<string, Map<number, ColorDefinition>>
): ColorSet | undefined {
  const selectedColorsArr: [string, number[]][] = Object.entries(selectedColors ?? {});
  if (!id || !type || !selectedColorsArr.length || !brands || !colors) {
    return;
  }
  const selectedBrandsMap = new Map<number, ColorBrandDefinition>(
    [...brands].filter(([brandId]) => selectedBrands?.includes(brandId))
  );
  if (!hasAccessToBrands(user, [...selectedBrandsMap.values()])) {
    return;
  }
  return {
    type,
    brands: selectedBrandsMap,
    colors: selectedColorsArr.flatMap(([brandIdStr, colorIds]: [string, number[]]): Color[] => {
      const brandId = parseInt(brandIdStr);
      const brandAlias: string | undefined = brands.get(brandId)?.alias;
      if (!brandAlias) {
        return [];
      }
      return colorIds
        .map((colorId: number): ColorDefinition | undefined => colors.get(brandAlias)?.get(colorId))
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
    }),
  };
}

export function hasAccessToBrand(user: User | null, {freeTier}: ColorBrandDefinition): boolean {
  return freeTier || !!user;
}

export function hasAccessToBrands(user: User | null, brands: ColorBrandDefinition[]): boolean {
  return !brands.some(({freeTier}) => !freeTier) || !!user;
}
