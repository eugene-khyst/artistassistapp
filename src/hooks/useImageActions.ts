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

import {saveAs} from 'file-saver';

import type {ZoomableImageCanvas} from '@/services/canvas/image/zoomable-image-canvas';
import {blobToImageFile} from '@/services/image/image-file';
import {printImages} from '@/services/print/print';
import {useAppStore} from '@/stores/app-store';
import {getFilename} from '@/utils/filename';
import {type DrawImageSource, imageToBlob} from '@/utils/graphics';

interface Props {
  canvas?: ZoomableImageCanvas | null;
  image?: DrawImageSource | null;
  filenameSuffix?: string;
}

interface ImageActions {
  print: () => void;
  save: () => Promise<void>;
  setAsReference: () => Promise<void>;
}

/** Print, save and set as reference for a tab showing one derived image. */
export function useImageActions({canvas, image, filenameSuffix}: Props): ImageActions {
  const selectedImageFile = useAppStore(state => state.selectedImageFile);
  const saveRecentImageFile = useAppStore(state => state.saveRecentImageFile);

  const filename = () => getFilename(selectedImageFile, filenameSuffix);

  return {
    print: () => {
      void printImages(canvas?.convertToOffscreenCanvas());
    },
    // Without an image the canvas is saved as rendered, including anything drawn over the photo.
    save: async () => {
      if (!image) {
        await canvas?.saveAsImage(filename());
        return;
      }
      saveAs(await imageToBlob(image), filename());
    },
    setAsReference: async () => {
      if (image) {
        await saveRecentImageFile(await blobToImageFile(await imageToBlob(image), filename()));
      }
    },
  };
}
