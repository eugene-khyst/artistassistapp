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

import {create2DArray, createArray, getIndexForCoord} from '~/src/utils';

export function medianFilter({data, width, height}: ImageData, radius: number, channels = 3): void {
  if (channels !== 1 && channels !== 3) {
    throw new Error('Channels must equal 1 or 3');
  }
  if (radius < 1) {
    return;
  }
  const origData = new Uint8ClampedArray(data);

  const mask: boolean[][] = getMask(radius);
  const removedMask: boolean[][] = maskDifference(mask, 0, 1);
  const addedMask: boolean[][] = maskDifference(mask, 1, 0);
  const maskIndexes: number[][] = maskToIndexes(mask);
  const removedMaskIndexes: number[][] = maskToIndexes(removedMask);
  const addedMaskIndexes: number[][] = maskToIndexes(addedMask);
  const median: number = getMedianFromMask(mask);

  for (let c = 0; c < channels; c++) {
    for (let y = radius; y < height - radius; y++) {
      const hist: number[] = createArray(256, 0);
      maskIndexes.forEach(([j, i]) => {
        hist[origData[getIndexForCoord(i!, j! + y - radius, width, c)]!]! += 1;
      });
      for (let x = radius; x < width - radius; x++) {
        removedMaskIndexes.forEach(([j, i]) => {
          hist[origData[getIndexForCoord(i! + x - radius, j! + y - radius, width, c)]!]! -= 1;
        });
        addedMaskIndexes.forEach(([j, i]) => {
          hist[origData[getIndexForCoord(i! + x - radius, j! + y - radius, width, c)]!]! += 1;
        });
        const v = getIndexInHistogram(hist, median);
        const index = getIndexForCoord(x, y, width, c);
        data[index] = v;
        if (channels === 1) {
          data[index + 1] = v;
          data[index + 2] = v;
        }
      }
    }
  }
}

function getMask(radius: number): boolean[][] {
  const diameter = 2 * radius;
  const radiusPow2 = radius * radius;
  const mask: boolean[][] = create2DArray(diameter + 1, diameter + 1, false);
  for (let j = 0; j <= diameter; j++) {
    const jMinusRadiusPow2 = Math.pow(j - radius, 2);
    for (let i = 0; i <= diameter; i++) {
      if (Math.pow(i - radius, 2) + jMinusRadiusPow2 - radiusPow2 <= 1) {
        mask[j]![i] = true;
      }
    }
  }
  return mask;
}

function maskDifference(
  mask: boolean[][],
  minuendXOffset: number,
  subtrahendXOffset: number
): boolean[][] {
  const maxOffset = Math.max(minuendXOffset, subtrahendXOffset);
  const difference: boolean[][] = create2DArray(mask.length, mask[0]!.length + maxOffset, false);
  for (let j = 0; j < difference.length; j++) {
    const row: boolean[] = mask[j]!;
    const {length: rowLength} = mask;
    for (let i = 0; i < difference[j]!.length; i++) {
      const i1 = i - minuendXOffset;
      const i2 = i - subtrahendXOffset;
      if (i1 >= 0 && i1 < rowLength && row[i1] && (i2 < 0 || i2 >= rowLength || !row[i2])) {
        difference[j]![i] = true;
      }
    }
  }
  return difference;
}

function maskToIndexes(mask: boolean[][]): number[][] {
  const indexes: number[][] = [];
  mask.forEach((row: boolean[], j: number) => {
    row.forEach((element: boolean, i: number) => {
      if (element) {
        indexes.push([j, i]);
      }
    });
  });
  return indexes;
}

function getMedianFromMask(mask: boolean[][]): number {
  let maskArea = 0;
  mask.forEach((row: boolean[]) => {
    row.forEach((element: boolean) => {
      if (element) {
        maskArea += 1;
      }
    });
  });
  return maskArea / 2;
}

function getIndexInHistogram(histogram: number[], value: number): number {
  let sum = 0;
  for (let i = 0; i < 256; i++) {
    sum += histogram[i]!;
    if (sum >= value) {
      return i;
    }
  }
  return 255;
}
