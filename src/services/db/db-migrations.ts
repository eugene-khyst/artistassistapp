/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  Color,
  ColorBrand,
  ColorMixture,
  ColorMixturePart,
  ColorSetDefinition,
  ColorType,
  SamplingArea,
} from '~/src/services/color';
import type {RgbTuple} from '~/src/services/color/space';

/**
 * @deprecated
 */
export interface LegacyPaintSetDefinition {
  type?: ColorType;
  brands: ColorBrand[];
  storeBoughtPaintSet?: [0] | [ColorBrand, string];
  colors: Partial<Record<ColorBrand, number[]>>;
  timestamp?: number;
}

/**
 * @deprecated
 */
export type LegacyPaintConsistency = [paintPart: number, otherPart: number];

/**
 * @deprecated
 */
export interface LegacyPaintFraction {
  paint: Color;
  fraction: number;
}

/**
 * @deprecated
 */
export interface LegacyPaintMix {
  id: string;
  name?: string | null;
  type: ColorType;
  paintMixRgb: RgbTuple;
  paintMixRho: number[];
  fractions: LegacyPaintFraction[];
  consistency: LegacyPaintConsistency;
  backgroundRgb: RgbTuple | null;
  paintMixLayerRgb: RgbTuple;
  imageFileId?: number;
  pipet?: SamplingArea;
  dataIndex?: number;
}

export function toColorSet({
  type,
  brands,
  storeBoughtPaintSet,
  colors,
  timestamp,
}: LegacyPaintSetDefinition): ColorSetDefinition {
  return {
    type,
    brands,
    standardColorSet: storeBoughtPaintSet,
    colors,
    timestamp,
  };
}

export function toColorMixture({
  id,
  name,
  type,
  paintMixRgb,
  paintMixRho,
  fractions,
  consistency: [paintPart, otherPart],
  backgroundRgb,
  paintMixLayerRgb,
  imageFileId,
  pipet,
  dataIndex,
}: LegacyPaintMix): ColorMixture {
  return {
    key: id,
    name,
    type,
    colorMixtureRgb: paintMixRgb,
    colorMixtureRho: paintMixRho,
    parts: fractions.map(
      ({paint, fraction}: LegacyPaintFraction): ColorMixturePart => ({
        color: paint,
        part: fraction,
      })
    ),
    whiteFraction: [0, 1],
    tintRgb: paintMixRgb,
    consistency: [paintPart, paintPart + otherPart],
    backgroundRgb,
    layerRgb: paintMixLayerRgb,
    imageFileId,
    samplingArea: pipet,
    timestamp: dataIndex,
  };
}
