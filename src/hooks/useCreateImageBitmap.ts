/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {useEffect, useState} from 'react';

interface Result {
  images: ImageBitmap[];
  isLoading: boolean;
}

export function useCreateImageBitmap(
  blobToImageBitmapsConverter: (blob: Blob) => Promise<ImageBitmap[]>,
  blob?: Blob
): Result {
  const [images, setImages] = useState<ImageBitmap[]>([]);
  const [blobLoadingCount, setBlobLoadingCount] = useState<number>(0);

  useEffect(() => {
    (async () => {
      if (blob) {
        setBlobLoadingCount((prev: number) => prev + 1);
        const newImages: ImageBitmap[] = await blobToImageBitmapsConverter(blob);
        setImages((prev: ImageBitmap[]) => {
          prev.forEach((image: ImageBitmap) => {
            image.close();
          });
          return newImages;
        });
        setBlobLoadingCount((prev: number) => prev - 1);
      } else {
        setImages([]);
      }
    })();
  }, [blobToImageBitmapsConverter, blob]);

  return {
    images,
    isLoading: blobLoadingCount > 0,
  };
}
