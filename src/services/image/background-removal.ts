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

import {BACKGROUND_REMOVAL_DATA_URL} from '~/src/config';

export async function removeBackground(
  file: File,
  progress?: (key: string, current: number, total: number) => void
): Promise<Blob> {
  console.time('background-removal');
  const {removeBackground} = await import('@imgly/background-removal');
  const noBgBlob = await removeBackground(file, {
    publicPath: BACKGROUND_REMOVAL_DATA_URL,
    progress: (key, current, total) => {
      console.log(`Downloading ${key}: ${current} of ${total}`);
      progress?.(key, current, total);
    },
  });
  console.timeEnd('background-removal');
  return noBgBlob;
}
