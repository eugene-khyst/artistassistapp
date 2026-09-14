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
import {ImageEditorKey} from '@/image-editor';
import {hasAccessTo} from '@/services/auth/utils';
import {detectDocumentCorners} from '@/services/image/correct-perspective';
import {commandVertices, EditImageCommandType} from '@/services/image/edit-image-command';
import type {Vector} from '@/services/math/geometry';
import type {OnnxModel} from '@/services/ml/types';
import type {AuthSlice} from '@/stores/auth-slice';
import type {EditImageSlice} from '@/stores/edit-image-slice';
import {imageEditorControls} from '@/stores/registry/image-editor-registry';

export interface CorrectPerspectiveSlice {
  correctPerspectiveModel?: OnnxModel;
  // [] clears the corners, undefined leaves them alone.
  correctPerspectiveVertices?: Vector[];

  correctPerspectiveImage: (vertices: Vector[]) => void;
  setCorrectPerspectiveModel: (correctPerspectiveModel: OnnxModel | undefined) => void;
  autoDetectCorrectPerspectiveVertices: () => Promise<Vector[] | null | undefined>;
}

type CorrectPerspectiveSliceDependencies = Pick<AuthSlice, 'auth'> &
  Pick<EditImageSlice, 'editImageOperation' | 'undoneEditImageHistory'>;

export const createCorrectPerspectiveSlice: StateCreator<
  CorrectPerspectiveSlice & CorrectPerspectiveSliceDependencies,
  [],
  [],
  CorrectPerspectiveSlice
> = (set, get) => {
  // Applying clears the corners, so only an undone edit can bring them back.
  const undoneCorrectPerspectiveVertices = (): Vector[] | undefined =>
    commandVertices(
      get().undoneEditImageHistory.at(-1)?.command,
      EditImageCommandType.CorrectPerspective
    );

  imageEditorControls.register(ImageEditorKey.CorrectPerspective, {
    reset: () => {
      set({
        correctPerspectiveVertices: undoneCorrectPerspectiveVertices(),
      });
    },
    restore: () => {
      set({
        correctPerspectiveVertices: undoneCorrectPerspectiveVertices() ?? [],
      });
    },
  });

  return {
    correctPerspectiveImage: (vertices: Vector[]): void => {
      void get().editImageOperation.execute({
        type: EditImageCommandType.CorrectPerspective,
        vertices: vertices.map(({x, y}) => ({x, y})),
      });
    },

    setCorrectPerspectiveModel: (perspectiveCorrectionModel: OnnxModel | undefined): void => {
      if (get().correctPerspectiveModel === perspectiveCorrectionModel) {
        return;
      }
      set({
        correctPerspectiveModel: perspectiveCorrectionModel,
      });
    },

    autoDetectCorrectPerspectiveVertices: async (): Promise<Vector[] | null | undefined> => {
      const {correctPerspectiveModel: perspectiveCorrectionModel, auth} = get();
      if (!perspectiveCorrectionModel || !hasAccessTo(auth?.user, perspectiveCorrectionModel)) {
        return null;
      }
      const vertices = await get().editImageOperation.withEditedImage(
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
      return get().correctPerspectiveModel === perspectiveCorrectionModel ? vertices : undefined;
    },
  };
};
