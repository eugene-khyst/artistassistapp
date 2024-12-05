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

import {linearizeRgbChannel, unlinearizeRgbChannel} from '~/src/services/color/space';

export function whitePatch({data}: ImageData, percentile = 0.95): void {
  const channelValues: [number[], number[], number[]] = [[], [], []];
  for (let i = 0; i < data.length; i += 4) {
    channelValues[0].push(linearizeRgbChannel(data[i]!));
    channelValues[1].push(linearizeRgbChannel(data[i + 1]!));
    channelValues[2].push(linearizeRgbChannel(data[i + 2]!));
  }
  const maxValues = channelValues.map(channel => {
    channel.sort((a, b) => a - b);
    const index = Math.floor(percentile * channel.length) - 1;
    return channel[Math.max(0, index)];
  });
  for (let i = 0; i < data.length; i += 4) {
    const r = linearizeRgbChannel(data[i]!);
    const g = linearizeRgbChannel(data[i + 1]!);
    const b = linearizeRgbChannel(data[i + 2]!);

    const correctedR = Math.min(r / maxValues[0]!, 1);
    const correctedG = Math.min(g / maxValues[1]!, 1);
    const correctedB = Math.min(b / maxValues[2]!, 1);

    data[i] = unlinearizeRgbChannel(correctedR);
    data[i + 1] = unlinearizeRgbChannel(correctedG);
    data[i + 2] = unlinearizeRgbChannel(correctedB);
  }
}
