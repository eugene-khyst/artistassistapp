/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import type {RgbTuple} from '~/src/services/color/space';
import type {Fraction} from '~/src/utils';

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
  freeTier?: boolean;
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
  type: ColorType;
  brands: Map<number, ColorBrandDefinition>;
  colors: Color[];
}

export interface ColorMixingConfig {
  maxColors: 1 | 3;
  tint: boolean;
  glazing: boolean;
}

export interface ColorMixturePartDefinition {
  brand: number;
  id: number;
  part: number;
}

export interface ColorMixtureDefinition {
  type: ColorType;
  name: string | null;
  parts: ColorMixturePartDefinition[];
  consistency: Fraction;
  background: RgbTuple | null;
}

export interface ColorMixturePart {
  color: Color;
  part: number;
}

export interface SamplingArea {
  x: number;
  y: number;
  diameter: number;
}

export interface ColorMixture {
  id?: number;
  key: string;
  name?: string | null;
  type: ColorType;
  colorMixtureRgb: RgbTuple;
  colorMixtureRho: number[];
  parts: ColorMixturePart[];
  whiteFraction: Fraction;
  white?: Color | null;
  tintRgb: RgbTuple;
  consistency: Fraction;
  backgroundRgb?: RgbTuple | null;
  layerRgb: RgbTuple;
  imageFileId?: number | null;
  samplingArea?: SamplingArea | null;
  date?: Date | null;
}

export interface SimilarColor {
  colorMixture: ColorMixture;
  deltaE: number;
}
