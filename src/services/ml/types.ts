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

export enum OnnxModelType {
  LineDrawing = 'line-drawing',
  BackgroundRemoval = 'background-removal',
  StyleTransfer = 'style-transfer',
}

export type ColorChannelOrdering = 'RGB' | 'BGR';

export enum PostProcessing {
  MeanStdNormalization = 'mean-std-normalization',
  Invert = 'invert',
  ScaleTo255 = 'scale-to-255',
}

export interface OnnxModel {
  id: string;
  name: string;
  description?: string;
  image?: string;
  url: string;
  numInputs?: 1 | 2;
  resolution?: number | [number, number];
  maxPixelCount?: number;
  inputSizeMultiple?: number;
  preserveAspectRatio?: boolean;
  colorChannelOrdering?: ColorChannelOrdering;
  standardDeviation?: [number, number, number];
  mean?: [number, number, number];
  outputName?: string;
  postProcessing?: PostProcessing[];
  priority?: number;
  freeTier?: boolean;
}
