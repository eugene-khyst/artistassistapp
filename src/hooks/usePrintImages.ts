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

export function usePrintImages(image: (ImageBitmap | null) | ImageBitmap[]): Result {
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
      const blobs: Blob[] = await Promise.all(
        [image]
          .flat()
          .filter((image: ImageBitmap | null): image is ImageBitmap => !!image)
          .map((image: ImageBitmap): Promise<Blob> => {
            const [canvas] = imageBitmapToOffscreenCanvas(image);
            return canvas.convertToBlob();
          })
      );
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
