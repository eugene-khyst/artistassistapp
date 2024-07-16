/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import type {RefObject} from 'react';
import {useEffect, useRef, useState} from 'react';
import {useReactToPrint} from 'react-to-print';

import {imageBitmapToOffscreenCanvas} from '~/src/utils';

interface Result {
  ref: RefObject<HTMLDivElement>;
  printImagesUrls: string[];
  handlePrint: () => void;
}

type BlobSupplier = () => Promise<Blob | undefined>;

export function usePrintImages(image: (ImageBitmap | BlobSupplier | null) | ImageBitmap[]): Result {
  const ref = useRef<HTMLDivElement>(null);
  const promiseResolveRef = useRef<((value: void | PromiseLike<void>) => void) | null>(null);
  const [printImagesUrls, setPrintImagesUrls] = useState<string[]>([]);

  useEffect(() => {
    if (printImagesUrls.length && promiseResolveRef.current) {
      promiseResolveRef.current();
    }
  }, [printImagesUrls]);

  const handlePrint = useReactToPrint({
    content: () => ref.current,
    onBeforeGetContent: async () => {
      const blobs: Blob[] = (
        await Promise.all(
          [image]
            .flat()
            .map(async (image: ImageBitmap | BlobSupplier | null): Promise<Blob | undefined> => {
              if (image instanceof ImageBitmap) {
                const [canvas] = imageBitmapToOffscreenCanvas(image);
                return canvas.convertToBlob();
              } else if (typeof image === 'function') {
                return image();
              }
            })
        )
      ).filter((blob): blob is Blob => !!blob);
      return await new Promise<void>(resolve => {
        promiseResolveRef.current = resolve;
        const urls: string[] = blobs.map((blob: Blob): string => URL.createObjectURL(blob));
        setPrintImagesUrls(urls);
      });
    },
    onAfterPrint: () => {
      promiseResolveRef.current = null;
      printImagesUrls.forEach((url: string) => URL.revokeObjectURL(url));
      setPrintImagesUrls([]);
    },
  });

  return {
    ref,
    printImagesUrls,
    handlePrint,
  };
}
