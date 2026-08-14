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
  type ColorBrandDefinition,
  type ColorDefinition,
  ColorType,
  type CustomColorBrandDefinition,
  indexById,
  type StandardColorSetDefinition,
} from '@eugene-khyst/artistassistapp-color-mixer';
import {queryOptions} from '@tanstack/react-query';

import {DATA_COLORS_TIMEOUT_MS, DATA_METADATA_TIMEOUT_MS, DATA_URL} from '@/config';
import type {Authentication} from '@/services/auth/types';
import {decryptDataIfNeeded} from '@/services/auth/utils';
import {getCustomColorBrand, getCustomColorBrandsByType} from '@/services/db/custom-brand-db';
import {fetchJson} from '@/utils/fetch';

const COLOR_TYPE_ALIASES: Record<ColorType, string> = {
  [ColorType.WatercolorPaint]: 'watercolor-paint',
  [ColorType.Gouache]: 'gouache',
  [ColorType.AcrylicPaint]: 'acrylic-paint',
  [ColorType.OilPaint]: 'oil-paint',
  [ColorType.ColoredPencils]: 'colored-pencils',
  [ColorType.WatercolorPencils]: 'watercolor-pencils',
  [ColorType.DryPastel]: 'pastel',
  [ColorType.OilPastel]: 'oil-pastel',
  [ColorType.WaxPastel]: 'wax-pastel',
  [ColorType.AcrylicMarkers]: 'acrylic-markers',
  [ColorType.AcrylicGouache]: 'acrylic-gouache',
};

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
  return Number(alias.replace(CUSTOM_COLOR_BRAND_ALIAS_PREFIX, ''));
}

function getDataUrl(
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
  type: ColorType,
  signal?: AbortSignal
): Promise<ColorBrandDefinition[]> {
  const url = getDataUrl('brands', type);
  const brands = await fetchJson<ColorBrandDefinition[]>(url, {
    timeoutMs: DATA_METADATA_TIMEOUT_MS,
    signal,
  });
  const customBrands = (await getCustomColorBrandsByType(type)).map(toColorBrandDefinition);
  return [...brands, ...customBrands];
}

export async function fetchStandardColorSets(
  type: ColorType,
  brandAlias: string,
  signal?: AbortSignal
): Promise<StandardColorSetDefinition[]> {
  if (isCustomColorBrandAlias(brandAlias)) {
    return [];
  }
  const url = getDataUrl('sets', type, brandAlias);
  return fetchJson<StandardColorSetDefinition[]>(url, {
    timeoutMs: DATA_METADATA_TIMEOUT_MS,
    signal,
  });
}

export async function fetchColors(
  type: ColorType,
  brandAlias: string,
  auth: Authentication | null,
  signal?: AbortSignal
): Promise<ColorDefinition[]> {
  if (isCustomColorBrandAlias(brandAlias)) {
    return (await getCustomColorBrand(getCustomColorBrandIdFromAlias(brandAlias)))?.colors ?? [];
  }
  const url = getDataUrl('colors', type, brandAlias);
  const data = await fetchJson<unknown>(url, {
    timeoutMs: DATA_COLORS_TIMEOUT_MS,
    signal,
  });
  return (await decryptDataIfNeeded(data, auth)) ?? [];
}

export async function fetchColorsBulk(
  type: ColorType,
  brandAliases: string[],
  auth: Authentication | null,
  signal?: AbortSignal
): Promise<Map<string, Map<number, ColorDefinition>>> {
  return new Map(
    await Promise.all(
      brandAliases.map(
        async (brandAlias: string): Promise<[string, Map<number, ColorDefinition>]> => [
          brandAlias,
          indexById(await fetchColors(type, brandAlias, auth, signal)),
        ]
      )
    )
  );
}

export function colorBrandsQueryOptions(type: ColorType, customColorBrandsReloadRevision: number) {
  return queryOptions({
    queryKey: ['brands', type, customColorBrandsReloadRevision] as const,
    queryFn: ({signal}) => fetchColorBrands(type, signal),
  });
}

export function colorsQueryOptions(
  type: ColorType,
  brandAlias: string,
  auth: Authentication | null,
  customColorBrandsReloadRevision: number
) {
  return queryOptions({
    queryKey: [
      'colors',
      type,
      brandAlias,
      auth?.user.id ?? null,
      isCustomColorBrandAlias(brandAlias) ? customColorBrandsReloadRevision : 0,
    ] as const,
    queryFn: ({signal}) => fetchColors(type, brandAlias, auth, signal),
  });
}

export function standardColorSetsQueryOptions(type: ColorType, brandAlias: string) {
  return queryOptions({
    queryKey: ['standardColorSets', type, brandAlias] as const,
    queryFn: ({signal}) => fetchStandardColorSets(type, brandAlias, signal),
  });
}
