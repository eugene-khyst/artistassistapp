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

import type {StateCreator} from 'zustand';

import {formatFetchProgress} from '@/i18n';
import {hasAccessTo} from '@/services/auth/utils';
import {EditImageCommandType} from '@/services/image/edit-image-command';
import {detectDocumentCorners} from '@/services/image/straighten';
import type {Vector} from '@/services/math/geometry';
import type {OnnxModel} from '@/services/ml/types';
import type {AuthSlice} from '@/stores/auth-slice';
import type {EditImageSlice} from '@/stores/edit-image-slice';

export interface StraightenSlice {
  perspectiveCorrectionModel?: OnnxModel;

  straightenImage: (vertices: Vector[]) => void;
  rotateImageClockwise: () => Promise<void>;
  setStraightenModel: (straightenModel: OnnxModel | undefined) => void;
  autoDetectStraightenVertices: () => Promise<Vector[] | null | undefined>;
}

type StraightenSliceDependencies = Pick<AuthSlice, 'auth'> &
  Pick<EditImageSlice, 'editImageOperation'>;

export const createStraightenSlice: StateCreator<
  StraightenSlice & StraightenSliceDependencies,
  [],
  [],
  StraightenSlice
> = (set, get) => {
  return {
    straightenImage: (vertices: Vector[]): void => {
      void get().editImageOperation.execute({
        type: EditImageCommandType.Straighten,
        vertices: vertices.map(({x, y}) => ({x, y})),
      });
    },

    rotateImageClockwise: async (): Promise<void> => {
      await get().editImageOperation.execute({type: EditImageCommandType.RotateClockwise});
    },

    setStraightenModel: (perspectiveCorrectionModel: OnnxModel | undefined): void => {
      if (get().perspectiveCorrectionModel === perspectiveCorrectionModel) {
        return;
      }
      set({
        perspectiveCorrectionModel,
      });
    },

    autoDetectStraightenVertices: async (): Promise<Vector[] | null | undefined> => {
      const {perspectiveCorrectionModel, auth} = get();
      if (!perspectiveCorrectionModel || !hasAccessTo(auth?.user, perspectiveCorrectionModel)) {
        return null;
      }
      const vertices = await get().editImageOperation.run(
        async ({image, setDownloadTip, signal}) =>
          image
            ? await detectDocumentCorners(
                image,
                perspectiveCorrectionModel,
                auth,
                (key, progress) => {
                  setDownloadTip(formatFetchProgress(key, progress));
                },
                signal
              )
            : null
      );
      return get().perspectiveCorrectionModel === perspectiveCorrectionModel ? vertices : undefined;
    },
  };
};
