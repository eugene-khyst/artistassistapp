/**
 * ArtistAssistApp
 * Copyright (C) 2023-2025  Eugene Khyst
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

import {arrayBufferToBlob} from '~/src/utils/blob';

export interface ImageFile {
  id?: number;
  buffer: ArrayBuffer;
  type: string;
  name?: string;
  date?: Date;
}

export async function fileToImageFile(file: File): Promise<ImageFile> {
  const {type, name} = file;
  return {
    buffer: await file.arrayBuffer(),
    type,
    name,
    date: new Date(),
  };
}

export async function blobToImageFile(blob: Blob, name?: string): Promise<ImageFile> {
  return {
    buffer: await blob.arrayBuffer(),
    type: blob.type,
    name,
  };
}

export function imageFileToFile(imageFile: ImageFile): File {
  const {buffer, type, name, date} = imageFile;
  return new File([arrayBufferToBlob(buffer, type)], name ?? '', {
    type,
    lastModified: date?.getTime(),
  });
}
