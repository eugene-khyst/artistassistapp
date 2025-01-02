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

import {kelvinToRgb} from '~/src/services/color';
import {linearizeRgbChannel, unlinearizeRgbChannel} from '~/src/services/color/space';
import {clamp} from '~/src/services/math';
import {imageBitmapToImageData} from '~/src/utils';

export interface AdjustmentParameters {
  saturation: number;
  inputLow: number;
  inputHigh: number;
  gamma: number;
  outputLow: number;
  outputHigh: number;
  origTemperature: number;
  targetTemperature: number;
}

export function sortRgbChannels(imageData: ImageData): Uint8ClampedArray[] {
  const {data} = imageData;
  const length = Math.ceil(data.length / 4);
  const channels = Array.from({length: 3}, () => new Uint8ClampedArray(length));
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    for (let channel = 0; channel < 3; channel++) {
      channels[channel]![j] = data[i + channel]!;
    }
  }
  channels.forEach(channel => channel.sort());
  return channels;
}

export function calculatePercentiles(
  sortedRgbChannels: Uint8ClampedArray[],
  percentile: number
): number[] {
  return sortedRgbChannels.map(channel => {
    const index = Math.floor(percentile * channel.length) - 1;
    return linearizeRgbChannel(channel[Math.max(0, index)]!);
  });
}

export function adjustColors(
  image: ImageBitmap,
  maxValues: number[] = [1, 1, 1],
  {
    saturation = 1,
    inputLow = 0,
    inputHigh = 1,
    gamma = 1,
    outputLow = 0,
    outputHigh = 1,
    origTemperature = 6500,
    targetTemperature = 6500,
  }: AdjustmentParameters
): ImageBitmap {
  const [imageData, canvas, ctx] = imageBitmapToImageData(image);
  const {data} = imageData;

  const origTempRgb = kelvinToRgb(origTemperature);
  const targetTempRgb = kelvinToRgb(targetTemperature);
  const scaleR = (origTempRgb.r || 1) / (targetTempRgb.r || 1);
  const scaleG = (origTempRgb.g || 1) / (targetTempRgb.g || 1);
  const scaleB = (origTempRgb.b || 1) / (targetTempRgb.b || 1);

  for (let i = 0; i < data.length; i += 4) {
    let r = linearizeRgbChannel(data[i]!);
    let g = linearizeRgbChannel(data[i + 1]!);
    let b = linearizeRgbChannel(data[i + 2]!);

    r = Math.min(r / maxValues[0]!, 1);
    g = Math.min(g / maxValues[1]!, 1);
    b = Math.min(b / maxValues[2]!, 1);

    if (saturation != 1) {
      const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      r = clamp(r + (luminance - r) * (1 - saturation), 0, 1);
      g = clamp(g + (luminance - g) * (1 - saturation), 0, 1);
      b = clamp(b + (luminance - b) * (1 - saturation), 0, 1);
    }

    if (inputLow != 0 || inputHigh != 1 || gamma != 1 || outputLow != 0 || outputHigh != 1) {
      [r, g, b] = [r, g, b].map(channel => {
        let value = (channel - inputLow) / (inputHigh - inputLow);
        value = clamp(value, 0, 1);
        value = Math.pow(value, 1 / gamma);
        value = outputLow + value * (outputHigh - outputLow);
        return clamp(value, 0, 1);
      }) as [number, number, number];
    }

    if (scaleR != 1 || scaleG != 1 || scaleB != 1) {
      r *= clamp(scaleR, 0, 1);
      g *= clamp(scaleG, 0, 1);
      b *= clamp(scaleB, 0, 1);
    }

    data[i] = unlinearizeRgbChannel(r);
    data[i + 1] = unlinearizeRgbChannel(g);
    data[i + 2] = unlinearizeRgbChannel(b);
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.transferToImageBitmap();
}
