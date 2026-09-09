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

import {type CatalogItem} from '@/services/catalog';

export enum OnnxModelType {
  LineDrawing = 'line-drawing',
  BackgroundRemoval = 'background-removal',
  StyleTransfer = 'style-transfer',
  PerspectiveCorrection = 'perspective-correction',
  Inpainting = 'inpainting',
  Upscaling = 'upscaling',
  Colorization = 'colorization',
  Restoration = 'restoration',
}

export const SOBEL_EDGE_DETECTION_MODEL_ID = 'sobel-edge-detection';
export const INPAINTING_MODEL_ID = 'inpainting_lama_2025jan';
export const UPSCALING_MODEL_ID = 'real-esrgan-general-x4v3';

export type ColorChannelOrdering = 'RGB' | 'BGR' | 'R' | 'A';

export enum PreProcessing {
  MeanStdNormalization = 'mean-std-normalization',
  Binarize = 'binarize',
}

export enum PostProcessing {
  MeanStdNormalization = 'mean-std-normalization',
  Invert = 'invert',
  ScaleTo255 = 'scale-to-255',
}

export interface OnnxModel extends CatalogItem {
  url: string;
  numInputs?: 1 | 2;
  resolution?: number | [number, number];
  maxPixelCount?: number;
  inputSizeMultiple?: number;
  colorChannelOrdering?:
    | ColorChannelOrdering
    | {
        input: ColorChannelOrdering[];
        output: ColorChannelOrdering;
      };
  preProcessing?: PreProcessing[] | PreProcessing[][];
  standardDeviation?: [number, number, number];
  mean?: [number, number, number];
  outputName?: string;
  postProcessing?: PostProcessing[];
}
