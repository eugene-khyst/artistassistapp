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

import {useEffect, useState} from 'react';

interface Result {
  isLoading: boolean;
  imageBitmap?: ImageBitmap;
}

interface ImageBitmapEntry {
  blob: Blob;
  imageBitmap?: ImageBitmap;
}

export function useCreateImageBitmap(blob?: Blob | null): Result {
  const [entry, setEntry] = useState<ImageBitmapEntry>();

  useEffect(() => {
    if (!blob) {
      return;
    }
    const controller = new AbortController();
    let createdImageBitmap: ImageBitmap | undefined;
    void (async () => {
      try {
        const imageBitmap = await createImageBitmap(blob);
        createdImageBitmap = imageBitmap;
        if (!controller.signal.aborted) {
          setEntry({blob, imageBitmap});
        } else {
          imageBitmap.close();
        }
      } catch (error) {
        console.error(error);
        if (!controller.signal.aborted) {
          setEntry({blob});
        }
      }
    })();
    return () => {
      controller.abort();
      createdImageBitmap?.close();
      setEntry(current => (current?.blob === blob ? undefined : current));
    };
  }, [blob]);

  const imageBitmap = entry?.blob === blob ? entry?.imageBitmap : undefined;
  const isLoading = !!blob && entry?.blob !== blob;

  return {
    isLoading,
    imageBitmap,
  };
}
