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

import {useEffect, useState} from 'react';

import type {ImageFile} from '~/src/services/image/image-file';
import {arrayBufferToBlob} from '~/src/utils/blob';

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
