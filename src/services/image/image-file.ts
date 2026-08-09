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

import {digestArrayBuffer} from '@/utils/digest';

import {ImageUnreadableError} from './errors';

export interface ImageBlob {
  digest: string;
  blob: Blob;
}

export interface ImageMetadata {
  type: string;
  name?: string;
  digest: string;
  maxColors?: number;
  date: Date;
}

export type ImageFile = ImageBlob & ImageMetadata;

export type RecentImage = ImageMetadata & {blob?: Blob};

export async function readStoredImageBytes(
  {digest, name}: Pick<ImageMetadata, 'digest' | 'name'>,
  imageBlob: ImageBlob | undefined
): Promise<ArrayBuffer> {
  if (imageBlob?.digest !== digest) {
    throw new ImageUnreadableError(digest, name);
  }
  try {
    const bytes = await imageBlob.blob.arrayBuffer();
    if ((await digestArrayBuffer(bytes)) !== digest) {
      throw new ImageUnreadableError(digest, name);
    }
    return bytes;
  } catch (error) {
    if (error instanceof ImageUnreadableError) {
      throw error;
    }
    throw new ImageUnreadableError(digest, name, error);
  }
}

export async function materializeImageFile(imageFile: ImageFile): Promise<ImageFile> {
  const bytes = await readStoredImageBytes(imageFile, {
    digest: imageFile.digest,
    blob: imageFile.blob,
  });
  return {
    ...imageFile,
    blob: new Blob([bytes], {type: imageFile.type}),
  };
}

export function toImageMetadata({digest, type, name, maxColors, date}: ImageFile): ImageMetadata {
  return {
    digest,
    type,
    ...(name === undefined ? {} : {name}),
    ...(maxColors === undefined ? {} : {maxColors}),
    date,
  };
}

// Keep metadata separate because WebKit corrupts rewritten blobs (240216).
export function toImageBlob({digest, blob}: ImageFile): ImageBlob {
  return {digest, blob};
}

export async function fileToImageFile(file: File): Promise<ImageFile> {
  return blobToImageFile(file, file.name);
}

export async function blobToImageFile(blob: Blob, name?: string): Promise<ImageFile> {
  const bytes = await blob.arrayBuffer();
  return {
    blob: new Blob([bytes], {type: blob.type}),
    type: blob.type,
    name: name || undefined,
    digest: await digestArrayBuffer(bytes),
    date: new Date(),
  };
}

export function imageFileToFile(imageFile: ImageFile): File {
  const {blob, type, name, date} = imageFile;
  return new File([blob], name ?? '', {
    type,
    lastModified: date.getTime(),
  });
}
