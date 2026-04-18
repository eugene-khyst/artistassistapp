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

import {linearizeRgbChannel} from '~/src/services/color/space/rgb';
import {drawImageToOffscreenCanvas, offscreenCanvasToImageData} from '~/src/utils/graphics';

function buildCumulativeHistograms(imageData: ImageData): Uint32Array[] {
  const {data} = imageData;
  const histograms = Array.from({length: 3}, () => new Uint32Array(256));
  for (let i = 0; i < data.length; i += 4) {
    for (let channel = 0; channel < 3; channel++) {
      const value = data[i + channel]!;
      histograms[channel]![value]!++;
    }
  }
  for (const histogram of histograms) {
    for (let i = 1; i < 256; i++) {
      histogram[i]! += histogram[i - 1]!;
    }
  }
  return histograms;
}

export class RgbChannelsPercentileCalculator {
  private cumulativeHistograms: Uint32Array[] = [];
  private pixelCount = 0;

  setImage(image: ImageBitmap): void {
    console.time('build-rgb-histograms');
    const imageData: ImageData = offscreenCanvasToImageData(
      ...drawImageToOffscreenCanvas(image, {
        willReadFrequently: true,
      })
    );
    image.close();
    this.pixelCount = Math.floor(imageData.data.length / 4);
    this.cumulativeHistograms = buildCumulativeHistograms(imageData);
    console.timeEnd('build-rgb-histograms');
  }

  calculatePercentiles(percentile: number): number[] {
    const target = Math.max(0, Math.floor(percentile * this.pixelCount) - 1);
    return this.cumulativeHistograms.map(cumulative => {
      let lo = 0;
      let hi = 255;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (cumulative[mid]! <= target) {
          lo = mid + 1;
        } else {
          hi = mid;
        }
      }
      return linearizeRgbChannel(lo);
    });
  }
}
