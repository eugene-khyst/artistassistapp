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

import printJS from 'print-js';

import type {PaperSizeDefinition} from '~/src/services/print/types';
import {PaperSize} from '~/src/services/print/types';
import {imageBitmapToOffscreenCanvas} from '~/src/utils/graphics';

export const PAPER_SIZES = new Map<PaperSize, PaperSizeDefinition>([
  [
    PaperSize.A4,
    {
      name: 'A4 (210 × 297 mm)',
      size: [210, 297],
    },
  ],
  [
    PaperSize.Letter,
    {
      name: 'Letter (8.5 × 11 in)',
      size: [215.9, 279.4],
    },
  ],
  [
    PaperSize.Legal,
    {
      name: 'Legal (8.5 × 14 in)',
      size: [215.9, 355.6],
    },
  ],
]);

type BlobSupplier = () => Promise<Blob | undefined>;

type ImageSource = (ImageBitmap | BlobSupplier | null) | ImageBitmap[] | Blob[];

export async function printImages(image?: ImageSource) {
  if (!image) {
    return;
  }
  const urls: string[] = (
    await Promise.all(
      [image]
        .flat()
        .map(async (image: ImageBitmap | Blob | BlobSupplier | null): Promise<Blob | undefined> => {
          if (image instanceof Blob) {
            return image;
          } else if (image instanceof ImageBitmap) {
            const [canvas] = imageBitmapToOffscreenCanvas(image);
            return canvas.convertToBlob();
          } else if (typeof image === 'function') {
            return image();
          }
          return;
        })
    )
  )
    .filter((blob): blob is Blob => !!blob)
    .map((blob: Blob): string => URL.createObjectURL(blob));

  printJS({
    printable: urls,
    type: 'image',
    documentTitle: 'ArtistAssistApp',
    onPrintDialogClose: () => {
      urls.forEach((url: string) => {
        URL.revokeObjectURL(url);
      });
    },
  });
}
