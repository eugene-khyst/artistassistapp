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

import {useCallback, useEffect, useState} from 'react';
import {useReactToPrint} from 'react-to-print';

import {imageBitmapToOffscreenCanvas} from '~/src/utils';

type BlobSupplier = () => Promise<Blob | undefined>;

type ImageSource = (ImageBitmap | BlobSupplier | null) | ImageBitmap[] | Blob[];

interface Props {
  image: ImageSource;
  printing: boolean;
  setPrinting: React.Dispatch<React.SetStateAction<boolean>>;
}

export const PrintableImages: React.FC<Props> = ({image, printing, setPrinting}: Props) => {
  const [printImagesUrls, setPrintImagesUrls] = useState<string[]>([]);

  const printFn = useReactToPrint({
    documentTitle: 'ArtistAssistApp',
    onAfterPrint: () => {
      setPrintImagesUrls(prev => {
        prev.forEach((url: string) => {
          URL.revokeObjectURL(url);
        });
        return [];
      });
      setPrinting(false);
    },
  });

  const printRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node) {
        printFn(() => node);
      }
    },
    [printFn]
  );

  useEffect(() => {
    if (!printing) {
      return;
    }
    void (async () => {
      const urls: string[] = (
        await Promise.all(
          [image]
            .flat()
            .map(
              async (
                image: ImageBitmap | Blob | BlobSupplier | null
              ): Promise<Blob | undefined> => {
                if (image instanceof Blob) {
                  return image;
                } else if (image instanceof ImageBitmap) {
                  const [canvas] = imageBitmapToOffscreenCanvas(image);
                  return canvas.convertToBlob();
                } else if (typeof image === 'function') {
                  return image();
                }
                return;
              }
            )
        )
      )
        .filter((blob): blob is Blob => !!blob)
        .map((blob: Blob): string => URL.createObjectURL(blob));
      setPrintImagesUrls(urls);
    })();
  }, [image, printing]);

  return (
    <div style={{display: 'none'}}>
      {!!printImagesUrls.length && (
        <div ref={printRef}>
          {printImagesUrls.map((url: string, i: number) => (
            <img key={i} src={url} style={{breakAfter: 'always', width: '100%'}} />
          ))}
        </div>
      )}
    </div>
  );
};
