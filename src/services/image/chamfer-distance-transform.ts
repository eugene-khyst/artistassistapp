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

export function chamferDistanceTransform(
  labels: Uint32Array,
  width: number,
  height: number
): Uint16Array {
  const distances = new Uint16Array(width * height);
  const INF = 0xffff;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        distances[i] = 0;
        continue;
      }
      const label = labels[i]!;
      if (
        labels[i - width] !== label ||
        labels[i + width] !== label ||
        labels[i - 1] !== label ||
        labels[i + 1] !== label
      ) {
        distances[i] = 0;
      } else {
        distances[i] = INF;
      }
    }
  }

  for (let y = 1; y <= height - 2; y++) {
    for (let x = 1; x <= width - 2; x++) {
      const i = y * width + x;
      if (distances[i] === 0) {
        continue;
      }
      const d = Math.min(
        distances[i - width - 1]! + 4,
        distances[i - width]! + 3,
        distances[i - width + 1]! + 4,
        distances[i - 1]! + 3
      );
      if (d < distances[i]!) {
        distances[i] = d;
      }
    }
  }

  for (let y = height - 2; y >= 1; y--) {
    for (let x = width - 2; x >= 1; x--) {
      const i = y * width + x;
      if (distances[i] === 0) {
        continue;
      }
      const d = Math.min(
        distances[i + width + 1]! + 4,
        distances[i + width]! + 3,
        distances[i + width - 1]! + 4,
        distances[i + 1]! + 3
      );
      if (d < distances[i]!) {
        distances[i] = d;
      }
    }
  }

  return distances;
}
