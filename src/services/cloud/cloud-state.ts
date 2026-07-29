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
  type CloudColorMixture,
  type CloudState,
  type CustomColorBrandJson,
} from '@/services/cloud/types';
import {Reflectance} from '@/services/color/space/reflectance';
import {hexToRgb} from '@/services/color/space/rgb';
import type {
  ColorMixture,
  ColorSetDefinition,
  CustomColorBrandDefinition,
  CustomColorBrandSource,
} from '@/services/color/types';
import type {ImageMetadata} from '@/services/image/image-file';
import {validateCloudState, validateCustomColorBrandJson} from '@/services/validation';
import {byNumber, byString, compare} from '@/utils/comparator';
import {digestMessage} from '@/utils/digest';
import {canonicalize, safeParseJson} from '@/utils/json';

export const STATE_FILE_NAME = 'ArtistAssistApp Data.json';

interface LocalCloudState {
  customBrands: CustomColorBrandDefinition[];
  colorSets: ColorSetDefinition[];
  images: ImageMetadata[];
  colorMixtures: ColorMixture[];
}

function removeDate<T extends {date?: Date | null}>(values: T[]): Omit<T, 'date'>[] {
  return values.map(({date: _, ...rest}) => rest);
}

export const fromCustomColorBrandSource = ({
  id,
  type,
  name,
  colors,
}: CustomColorBrandSource): CustomColorBrandDefinition => ({
  ...(id ? {id} : {}),
  type,
  name,
  colors: colors?.map(({hex, ...color}) => ({
    ...color,
    hex,
    rho: [...Reflectance.fromRgb(...hexToRgb(hex)).toArray()],
  })),
});

export const toCustomColorBrandSource = ({
  id,
  type,
  name,
  colors,
}: CustomColorBrandDefinition): CustomColorBrandSource => ({
  id,
  type,
  name,
  colors: colors?.map(({rho: _, ...color}) => ({...color})),
});

export const createCloudState = ({
  customBrands,
  colorSets,
  images,
  colorMixtures,
}: LocalCloudState): CloudState => ({
  customBrands: customBrands
    .map(brand => toCustomColorBrandSource(brand))
    .sort(byNumber(({id}) => id)),
  colorSets: removeDate(colorSets.slice().sort(byNumber(({id}) => id))),
  images: images.slice().sort(byString(({digest}) => digest)),
  colorMixtures: removeDate(
    colorMixtures.slice().sort(
      compare(
        byString(({imageFileDigest}) => imageFileDigest),
        byNumber(({id}) => id)
      )
    )
  ).map(({layerRho, ...rest}): CloudColorMixture => ({
    ...rest,
    layerRho: Array.from(layerRho),
  })),
});

export function parseCloudState(json: string): CloudState | undefined {
  return validateCloudState(safeParseJson<unknown>(json));
}

export function parseCustomColorBrandJson(json: string): CustomColorBrandJson | undefined {
  return validateCustomColorBrandJson(safeParseJson<unknown>(json));
}

export async function serializeAndHashCloudState(
  state: CloudState
): Promise<{json: string; hash: string}> {
  const json = serializeCloudState(state);
  return {
    json,
    hash: await digestMessage(json),
  };
}

export function serializeCloudState({
  customBrands,
  colorSets,
  images,
  colorMixtures,
}: CloudState): string {
  return JSON.stringify(
    canonicalize({
      customBrands,
      colorSets,
      images,
      colorMixtures,
    })
  );
}
