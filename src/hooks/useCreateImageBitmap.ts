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

interface Result {
  isLoading: boolean;
  imageBitmap?: ImageBitmap;
}

export function useCreateImageBitmap(blob?: Blob | null): Result {
  const [imageBitmap, setImageBitmap] = useState<ImageBitmap>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!blob) {
      setImageBitmap(undefined);
      return;
    }
    setIsLoading(true);
    let imageBitmap: ImageBitmap | undefined;
    void (async () => {
      try {
        imageBitmap = await createImageBitmap(blob);
        setImageBitmap(prev => {
          prev?.close();
          return imageBitmap;
        });
      } finally {
        setIsLoading(false);
      }
    })();
    return () => {
      imageBitmap?.close();
    };
  }, [blob]);

  return {
    isLoading,
    imageBitmap,
  };
}
