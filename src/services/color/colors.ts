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
  byBoolean,
  byString,
  type Color,
  type ColorBrandDefinition,
  type ColorDefinition,
  type ColorIdFormat,
  type ColorSet,
  type ColorSetDefinition,
  ColorType,
  type Comparator,
  compare,
  hexToRgb,
  reverseOrder,
} from '@eugene-khyst/artistassistapp-color-mixer';

import {type User} from '@/services/auth/types';
import {hasAccessTo} from '@/services/auth/utils';

export const COLOR_TYPES: ColorType[] = [
  ColorType.WatercolorPaint,
  ColorType.OilPaint,
  ColorType.AcrylicPaint,
  ColorType.Gouache,
  ColorType.AcrylicGouache,
  ColorType.DryPastel,
  ColorType.OilPastel,
  ColorType.WaxPastel,
  ColorType.ColoredPencils,
  ColorType.WatercolorPencils,
  ColorType.AcrylicMarkers,
];

export const compareColorBrandsByName = ({
  prioritizeFreeTier,
}: {
  prioritizeFreeTier: boolean;
}): Comparator<ColorBrandDefinition> =>
  compare(
    prioritizeFreeTier && reverseOrder(byBoolean(({freeTier}) => freeTier)),
    byString(({fullName}) => fullName)
  );

export function formatColorLabel(
  {id, name}: ColorDefinition | Color,
  {idFormat = {}}: ColorBrandDefinition
): string {
  const {
    show,
    prefix: defaultPrefix,
    prefixes,
    suffix,
    padLength,
    splitAt,
    delimiter = '-',
    replace,
    replacements,
  }: ColorIdFormat = {
    show: true,
    ...idFormat,
  };
  if (show) {
    const prefixOverride = prefixes?.find(
      ({range: [startId, endId]}) => id >= startId && id <= endId
    )?.prefix;
    const prefix: string = prefixOverride ?? defaultPrefix ?? '';
    let idStr = `${prefix}${padLength ? String(id).padStart(padLength, '0') : id}${suffix ?? ''}`;
    if (splitAt && idStr.length > splitAt) {
      idStr = `${idStr.substring(0, splitAt)}${delimiter}${idStr.substring(splitAt)}`;
    }
    if (replace && replacements) {
      idStr = idStr.replace(new RegExp(replace), (match: string) => {
        return replacements[match] ?? match;
      });
    }
    return `${idStr} ${name}`;
  } else {
    return name;
  }
}

export function toColorSet(
  {id, name, type, brands: selectedBrands, colors: selectedColors}: ColorSetDefinition,
  brands?: Map<number, ColorBrandDefinition>,
  colors?: Map<string, Map<number, ColorDefinition>>,
  user?: User | null
): ColorSet | null {
  const selectedColorsArray: [string, number[]][] = Object.entries(selectedColors ?? {});
  if (!id || !type || !selectedColorsArray.length || !brands || !colors) {
    return null;
  }
  const selectedBrandsMap = new Map<number, ColorBrandDefinition>(
    [...brands].filter(([brandId]) => selectedBrands?.includes(brandId))
  );
  if (!hasAccessTo(user, [...selectedBrandsMap.values()])) {
    return null;
  }
  return {
    name,
    type,
    brands: selectedBrandsMap,
    colors: selectedColorsArray.flatMap(([brandIdStr, colorIds]: [string, number[]]): Color[] => {
      const brandId = Number(brandIdStr);
      const brandAlias: string | undefined = brands.get(brandId)?.alias;
      if (!brandAlias) {
        return [];
      }
      return colorIds
        .map((colorId: number): ColorDefinition | undefined => colors.get(brandAlias)?.get(colorId))
        .filter((color): color is ColorDefinition => !!color)
        .map(({id, name, hex, rho, opacity, warmth, isWhite}: ColorDefinition): Color => ({
          brand: brandId,
          id,
          name,
          rgb: hexToRgb(hex),
          rho,
          opacity,
          warmth,
          isWhite,
        }));
    }),
  };
}
