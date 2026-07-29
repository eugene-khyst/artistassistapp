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

import * as v from 'valibot';

import type {CloudState, CustomColorBrandJson} from '@/services/cloud/types';
import {ColorOpacity, ColorType, ColorWarmth} from '@/services/color/types';

const RgbTupleSchema = v.tuple([v.number(), v.number(), v.number()]);

const FractionSchema = v.tuple([v.number(), v.number()]);

const ColorDefinitionSchema = v.object({
  id: v.number(),
  name: v.string(),
  hex: v.string(),
  rho: v.array(v.number()),
  opacity: v.optional(v.number()),
  warmth: v.optional(v.number()),
});

const CloudCustomColorSchema = v.omit(ColorDefinitionSchema, ['rho']);

const CloudCustomColorBrandSchema = v.object({
  id: v.optional(v.number()),
  type: v.optional(v.enum(ColorType)),
  name: v.optional(v.string()),
  colors: v.optional(v.array(CloudCustomColorSchema)),
});

const ColorSetSchema = v.object({
  id: v.optional(v.number()),
  type: v.optional(v.enum(ColorType)),
  name: v.optional(v.string()),
  brands: v.optional(v.array(v.number())),
  standardColorSet: v.optional(
    v.union([v.tuple([v.number(), v.string()]), v.tuple([v.literal(0)])])
  ),
  colors: v.optional(v.record(v.string(), v.array(v.number()))),
});

const ImageMetadataSchema = v.object({
  type: v.string(),
  name: v.optional(v.string()),
  digest: v.string(),
  maxColors: v.optional(v.number()),
});

const ColorSchema = v.object({
  brand: v.number(),
  id: v.number(),
  name: v.string(),
  rgb: RgbTupleSchema,
  rho: v.array(v.number()),
  opacity: v.optional(v.enum(ColorOpacity)),
  warmth: v.optional(v.enum(ColorWarmth)),
});

const ColorMixtureSchema = v.object({
  id: v.optional(v.number()),
  key: v.string(),
  name: v.optional(v.nullable(v.string())),
  type: v.enum(ColorType),
  colorMixtureRgb: RgbTupleSchema,
  parts: v.array(
    v.object({
      color: ColorSchema,
      part: v.number(),
    })
  ),
  whiteFraction: FractionSchema,
  white: v.optional(v.nullable(ColorSchema)),
  tintRgb: RgbTupleSchema,
  consistency: FractionSchema,
  underlayerRgb: v.optional(v.nullable(RgbTupleSchema)),
  layerRgb: RgbTupleSchema,
  layerRho: v.array(v.number()),
  imageFileDigest: v.optional(v.nullable(v.string())),
  samplingArea: v.optional(
    v.nullable(
      v.object({
        x: v.number(),
        y: v.number(),
        diameter: v.number(),
      })
    )
  ),
});

const CloudStateSchema = v.object({
  customBrands: v.array(CloudCustomColorBrandSchema),
  colorSets: v.array(ColorSetSchema),
  images: v.array(ImageMetadataSchema),
  colorMixtures: v.array(ColorMixtureSchema),
});

const CustomColorBrandJsonSchema = v.omit(CloudCustomColorBrandSchema, ['id']);

export function validateCloudState(value: unknown): CloudState | undefined {
  const result = v.safeParse(CloudStateSchema, value);
  return result.success ? result.output : undefined;
}

export function validateCustomColorBrandJson(value: unknown): CustomColorBrandJson | undefined {
  const result = v.safeParse(CustomColorBrandJsonSchema, value);
  return result.success ? result.output : undefined;
}
