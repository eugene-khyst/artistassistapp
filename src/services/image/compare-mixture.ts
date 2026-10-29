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

import {type RgbTuple} from '@eugene-khyst/artistassistapp-color-mixer';
import {getAverageColorInBox} from '@eugene-khyst/artistassistapp-image-processing/color/average-color';
import {
  findMixturePhotoRegions,
  isUsableWhiteReference,
  whiteDistance,
} from '@eugene-khyst/artistassistapp-image-processing/color/swatch-color';
import type {Rectangle} from '@eugene-khyst/artistassistapp-image-processing/math/geometry';
import {
  DrawImage,
  type DrawImageSource,
  drawImageToOffscreenCanvas,
} from '@eugene-khyst/artistassistapp-image-processing/utils/graphics';

import type {ComparisonRegions} from '@/services/canvas/mode/image-comparison-mode';

export enum MixturePhotoProblem {
  MissingRegions,
  InvalidReference,
  OverlappingRegions,
}

export interface MixturePhotoSamples {
  reference: RgbTuple | null;
  mixture: RgbTuple | null;
  problem: MixturePhotoProblem | null;
}

function getRegionImageData(image: DrawImageSource, rectangle: Rectangle): ImageData {
  const [canvas, context] = drawImageToOffscreenCanvas(image, {
    drawImage: DrawImage.cropRectangle(rectangle),
    willReadFrequently: true,
  });
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

export function sampleMixturePhoto(
  image: DrawImageSource,
  regions: ComparisonRegions
): MixturePhotoSamples {
  const [a, b] = regions;
  if (!a || !b) {
    return {reference: null, mixture: null, problem: MixturePhotoProblem.MissingRegions};
  }
  const first = getRegionImageData(image, a);
  const second = getRegionImageData(image, b);
  const firstRgb = getAverageColorInBox(first)!;
  const secondRgb = getAverageColorInBox(second)!;
  const firstIsWhite = whiteDistance(firstRgb) <= whiteDistance(secondRgb);
  const reference = firstIsWhite ? firstRgb : secondRgb;
  if (!isUsableWhiteReference(firstIsWhite ? first : second)) {
    return {reference, mixture: null, problem: MixturePhotoProblem.InvalidReference};
  }
  if (
    Math.max(a.topLeft.x, b.topLeft.x) < Math.min(a.bottomRight.x, b.bottomRight.x) &&
    Math.max(a.topLeft.y, b.topLeft.y) < Math.min(a.bottomRight.y, b.bottomRight.y)
  ) {
    return {reference, mixture: null, problem: MixturePhotoProblem.OverlappingRegions};
  }
  const mixture = getAverageColorInBox(firstIsWhite ? second : first, {whiteReference: reference})!;
  return {reference, mixture, problem: null};
}

export function findMixtureRegions(image: DrawImageSource, target: RgbTuple): ComparisonRegions {
  const [canvas, context] = drawImageToOffscreenCanvas(image, {willReadFrequently: true});
  const regions = findMixturePhotoRegions(
    context.getImageData(0, 0, canvas.width, canvas.height),
    target
  );
  return [regions.reference, regions.mixture];
}
