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
  paletteColorMixtures: Map<string, ColorMixture>;
  selectedPaletteColorMixtures: Map<string, ColorMixture>;

  saveToPalette: (colorMixture: ColorMixture, linkToImage?: boolean) => Promise<void>;
  deleteFromPalette: (colorMixture: ColorMixture) => Promise<void>;
  deleteAllFromPalette: (type: ColorType) => Promise<void>;
  selectPaletteColorMixtures: (keys: string[]) => void;
}

export const createPaletteSlice: StateCreator<
  PaletteSlice & ColorMixerSlice & OriginalImageSlice,
  [],
  [],
  PaletteSlice
> = (set, get) => ({
  paletteColorMixtures: new Map(),
  selectedPaletteColorMixtures: new Map(),

  saveToPalette: async (colorMixture: ColorMixture, linkToImage = true): Promise<void> => {
    const {id, key} = colorMixture;

    const isNew = !id;
    if (isNew && linkToImage) {
      colorMixture.imageFileId = get().imageFile?.id;
      colorMixture.samplingArea = get().samplingArea;
    }

    await saveColorMixture(colorMixture);

    const {
      paletteColorMixtures: prevPaletteColorMixtures,
      selectedPaletteColorMixtures: prevSelected,
    } = get();

    const paletteColorMixtures = new Map<string, ColorMixture>(prevPaletteColorMixtures);
    let selectedPaletteColorMixtures = prevSelected;

    paletteColorMixtures.set(key, colorMixture);

    if (selectedPaletteColorMixtures.has(key)) {
      selectedPaletteColorMixtures = new Map(prevSelected);
      selectedPaletteColorMixtures.set(key, colorMixture);
    }

    set({
      paletteColorMixtures,
      selectedPaletteColorMixtures,
    });
  },
  deleteFromPalette: async ({key: keyToDelete}: ColorMixture): Promise<void> => {
    const {
      paletteColorMixtures: prevPaletteColorMixtures,
      selectedPaletteColorMixtures: prevSelected,
    } = get();

    const colorMixture = prevPaletteColorMixtures.get(keyToDelete);
    if (!colorMixture) {
      return;
    }

    if (colorMixture.id) {
      await deleteColorMixture(colorMixture.id);
    }

    const paletteColorMixtures = new Map(prevPaletteColorMixtures);
    let selectedPaletteColorMixtures = prevSelected;

    paletteColorMixtures.delete(keyToDelete);

    if (selectedPaletteColorMixtures.has(keyToDelete)) {
      selectedPaletteColorMixtures = new Map(prevSelected);
      selectedPaletteColorMixtures.delete(keyToDelete);
    }

    set({
      paletteColorMixtures,
      selectedPaletteColorMixtures,
    });
  },
  deleteAllFromPalette: async (typeToDelete: ColorType): Promise<void> => {
    const {
      paletteColorMixtures: prevPaletteColorMixtures,
      selectedPaletteColorMixtures: prevSelected,
    } = get();

    const keysToDelete: string[] = [];
    for (const {id, key, type} of prevPaletteColorMixtures.values()) {
      if (type === typeToDelete && id) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      const colorMixture = prevPaletteColorMixtures.get(key);
      if (colorMixture?.id) {
        await deleteColorMixture(colorMixture.id);
      }
    }

    const paletteColorMixtures = new Map(prevPaletteColorMixtures);
    const selectedPaletteColorMixtures = new Map(prevSelected);
    for (const key of keysToDelete) {
      paletteColorMixtures.delete(key);
      selectedPaletteColorMixtures.delete(key);
    }

    set({
      paletteColorMixtures,
      selectedPaletteColorMixtures,
    });
  },
  selectPaletteColorMixtures: (keys: string[]): void => {
    const {paletteColorMixtures} = get();
    const selectedPaletteColorMixtures = new Map<string, ColorMixture>(
      keys.flatMap((key: string): [string, ColorMixture][] => {
        const mixture: ColorMixture | undefined = paletteColorMixtures.get(key);
        return mixture ? [[mixture.key, mixture]] : [];
      })
    );
    set({
      selectedPaletteColorMixtures,
    });
  },
});
