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

import type {StateCreator} from 'zustand';

import type {ColorMixture, ColorType} from '~/src/services/color/types';
import {deleteColorMixture, saveColorMixture} from '~/src/services/db/color-mixture-db';

import type {ColorMixerSlice} from './color-mixer-slice';
import type {OriginalImageSlice} from './original-image-slice';

export interface PaletteSlice {
  paletteColorMixtures: ColorMixture[];

  saveToPalette: (colorMixture: ColorMixture, linkToImage?: boolean) => Promise<void>;
  deleteFromPalette: (colorMixture: ColorMixture) => Promise<void>;
  deleteAllFromPalette: (type: ColorType) => Promise<void>;
}

export const createPaletteSlice: StateCreator<
  PaletteSlice & ColorMixerSlice & OriginalImageSlice,
  [],
  [],
  PaletteSlice
> = (set, get) => ({
  paletteColorMixtures: [],

  saveToPalette: async (colorMixture: ColorMixture, linkToImage = true): Promise<void> => {
    const isNew = !colorMixture.id;
    if (isNew && linkToImage) {
      colorMixture.imageFileId = get().imageFile?.id;
      colorMixture.samplingArea = get().samplingArea;
    }
    await saveColorMixture(colorMixture);
    set(state => ({
      paletteColorMixtures: isNew
        ? [colorMixture, ...state.paletteColorMixtures]
        : state.paletteColorMixtures.map(
            (cm: ColorMixture): ColorMixture => (cm.id === colorMixture.id ? colorMixture : cm)
          ),
    }));
  },
  deleteFromPalette: async ({key: keyToDelete}: ColorMixture): Promise<void> => {
    const colorMixture = get().paletteColorMixtures.find(
      ({key}: ColorMixture) => key === keyToDelete
    );
    if (colorMixture?.id) {
      await deleteColorMixture(colorMixture.id);
      set(state => ({
        paletteColorMixtures: state.paletteColorMixtures.filter(
          ({id}: ColorMixture) => id !== colorMixture.id
        ),
      }));
    }
  },
  deleteAllFromPalette: async (typeToDelete: ColorType): Promise<void> => {
    for (const colorMixture of get().paletteColorMixtures) {
      if (colorMixture.type === typeToDelete && colorMixture.id) {
        await deleteColorMixture(colorMixture.id);
      }
    }
    set(state => {
      return {
        paletteColorMixtures: state.paletteColorMixtures.filter(
          ({type}: ColorMixture) => type !== typeToDelete
        ),
      };
    });
  },
});
