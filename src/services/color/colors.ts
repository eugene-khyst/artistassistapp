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

import {DATA_URL} from '~/src/config';
import type {User} from '~/src/services/auth/types';
import {hasAccessTo} from '~/src/services/auth/utils';
import type {
  BrandColorCount,
  Color,
  ColorBrandDefinition,
  ColorDefinition,
  ColorIdFormat,
  ColorSet,
  ColorSetDefinition,
  CustomColorBrandDefinition,
  StandardColorSetDefinition,
} from '~/src/services/color/types';
import {ColorType} from '~/src/services/color/types';
import {getCustomColorBrand, getCustomColorBrandsByType} from '~/src/services/db/custom-brand-db';
import type {Comparator} from '~/src/utils/comparator';
import {fetchSWR} from '~/src/utils/fetch';

import {Rgb} from './space/rgb';

export const COLOR_TYPES: ColorType[] = [
  ColorType.WatercolorPaint,
  ColorType.Gouache,
  ColorType.AcrylicPaint,
  ColorType.OilPaint,
  ColorType.ColoredPencils,
  ColorType.WatercolorPencils,
  ColorType.Pastel,
  ColorType.OilPastel,
  ColorType.AcrylicMarkers,
  ColorType.AcrylicGouache,
];

const COLOR_TYPE_ALIASES: Record<ColorType, string> = {
  [ColorType.WatercolorPaint]: 'watercolor-paint',
  [ColorType.Gouache]: 'gouache',
  [ColorType.AcrylicPaint]: 'acrylic-paint',
  [ColorType.OilPaint]: 'oil-paint',
  [ColorType.ColoredPencils]: 'colored-pencils',
  [ColorType.WatercolorPencils]: 'watercolor-pencils',
  [ColorType.Pastel]: 'pastel',
  [ColorType.OilPastel]: 'oil-pastel',
  [ColorType.AcrylicMarkers]: 'acrylic-markers',
  [ColorType.AcrylicGouache]: 'acrylic-gouache',
};

const CUSTOM_COLOR_BRAND_ID_BASE = 100000;
const CUSTOM_COLOR_BRAND_ALIAS_PREFIX = 'custom:';

export function computeStandardColorSetDefinitionId({name, colors}: StandardColorSetDefinition) {
  return `${colors.length}${name ? ` ${name}` : ''}`;
}

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

export const compareColorBrandsByName: Comparator<ColorBrandDefinition> = (
  {fullName: a},
  {fullName: b}
) => a.localeCompare(b);

export const compareColorBrandsByFreeTierAndName: Comparator<ColorBrandDefinition> = (a, b) =>
  (a.freeTier ?? false) === (b.freeTier ?? false)
    ? compareColorBrandsByName(a, b)
    : a.freeTier
      ? -1
      : 1;

function getResourceUrl(
  resource: 'brands' | 'colors' | 'sets',
  type: ColorType,
  brandAlias?: string
): string {
  const medium: string = COLOR_TYPE_ALIASES[type];
  if (resource === 'brands') {
    return `${DATA_URL}/${medium}/${resource}.json`;
  } else {
    return `${DATA_URL}/${medium}/${brandAlias}/${resource}.json`;
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
      computeStandardColorSetDefinitionId(standardColorSet),
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

export function colorSetDefinitionToBrandColorCounts(
  {brands: brandIds, colors}: ColorSetDefinition,
  brands?: Map<number, ColorBrandDefinition>
): BrandColorCount[] {
  if (!brandIds || !colors || !brands) {
    return [];
  }
  return brandIds.map((brandId: number): BrandColorCount => {
    const {shortName, fullName} = brands.get(brandId) ?? {};
    const colorCount = colors[brandId]!.length;
    return {
      brandName: `${shortName || fullName}`,
      colorCount,
    };
  });
}

export function colorSetToBrandColorCounts({brands, colors}: ColorSet): BrandColorCount[] {
  return [...brands.values()].map(
    ({id, shortName, fullName}: ColorBrandDefinition): BrandColorCount => {
      const colorCount = colors.filter(({brand}: Color): boolean => brand === id).length;
      return {
        brandName: shortName || fullName,
        colorCount,
      };
    }
  );
}

export function toColorSet(
  {id, name, type, brands: selectedBrands, colors: selectedColors}: ColorSetDefinition,
  brands?: Map<number, ColorBrandDefinition>,
  colors?: Map<string, Map<number, ColorDefinition>>,
  user?: User | null
): ColorSet | undefined {
  const selectedColorsArr: [string, number[]][] = Object.entries(selectedColors ?? {});
  if (!id || !type || !selectedColorsArr.length || !brands || !colors) {
    return;
  }
  const selectedBrandsMap = new Map<number, ColorBrandDefinition>(
    [...brands].filter(([brandId]) => selectedBrands?.includes(brandId))
  );
  if (!hasAccessTo(user, [...selectedBrandsMap.values()])) {
    return;
  }
  return {
    name,
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
          ({id, name, hex, rho, opacity, warmth}: ColorDefinition): Color => ({
            brand: brandId,
            id,
            name,
            rgb: Rgb.fromHex(hex).toTuple(),
            rho,
            opacity,
            warmth,
          })
        );
    }),
  };
}
