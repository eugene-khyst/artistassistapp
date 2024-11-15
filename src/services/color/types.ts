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
  Pastel = 8,
  OilPastel = 9,
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
  suffix?: string;
  padLength?: number;
  splitAt?: number;
  delimiter?: string;
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
  brands?: number[];
  standardColorSet?: [0] | [number, string];
  colors?: Record<number, number[]>;
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
  parts: ColorMixturePart[];
  whiteFraction: Fraction;
  white?: Color | null;
  tintRgb: RgbTuple;
  consistency: Fraction;
  backgroundRgb?: RgbTuple | null;
  layerRgb: RgbTuple;
  layerRho: number[];
  imageFileId?: number | null;
  samplingArea?: SamplingArea | null;
  date?: Date | null;
}

export interface SimilarColor {
  colorMixture: ColorMixture;
  similarity: number;
}
