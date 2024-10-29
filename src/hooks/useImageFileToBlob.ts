/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {useEffect, useState} from 'react';

import type {ImageFile} from '~/src/services/image';
import {arrayBufferToBlob} from '~/src/utils';

export function useImageFileToBlob(imageFile?: ImageFile | null): Blob | undefined {
  const [blob, setBlob] = useState<Blob>();

  useEffect(() => {
    if (!imageFile) {
      setBlob(undefined);
      return;
    }
    const {buffer, type} = imageFile;
    setBlob(arrayBufferToBlob(buffer, type));
  }, [imageFile]);

  return blob;
}
