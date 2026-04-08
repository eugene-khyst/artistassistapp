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

import type {ColorMixture, ColorType, SamplingArea} from '~/src/services/color/types';
import {
  deleteColorMixture,
  getColorMixtures,
  saveColorMixture,
} from '~/src/services/db/color-mixture-db';
import {createAbortError} from '~/src/utils/promise';

import type {ColorMixerSlice} from './color-mixer-slice';
import type {OriginalImageSlice} from './original-image-slice';

export interface SaveToPaletteEntry {
  colorMixture: ColorMixture;
  linkToImage?: boolean;
  samplingArea?: SamplingArea;
}

export interface PaletteSlice {
  paletteColorMixtures: Map<string, ColorMixture>;
  selectedPaletteColorMixtures: Map<string, ColorMixture>;
  isPaletteLoading: boolean;

  loadPaletteColorMixtures: () => Promise<void>;
  saveToPalette: (
    colorMixture: ColorMixture,
    linkToImage?: boolean,
    samplingArea?: SamplingArea
  ) => Promise<void>;
  saveToPaletteBulk: (entries: SaveToPaletteEntry[], signal?: AbortSignal) => Promise<void>;
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
  isPaletteLoading: false,

  loadPaletteColorMixtures: async (): Promise<void> => {
    const {imageFile} = get();
    set({
      isPaletteLoading: true,
    });
    try {
      const paletteColorMixtures = new Map<string, ColorMixture>(
        (await getColorMixtures(imageFile?.id)).map(colorMixture => [
          colorMixture.key,
          colorMixture,
        ])
      );
      set({
        paletteColorMixtures,
      });
    } finally {
      set({
        isPaletteLoading: false,
      });
    }
  },
  saveToPalette: async (
    colorMixture: ColorMixture,
    linkToImage = true,
    samplingArea?: SamplingArea
  ): Promise<void> => {
    await get().saveToPaletteBulk([
      {
        colorMixture,
        linkToImage,
        samplingArea,
      },
    ]);
  },
  saveToPaletteBulk: async (entries: SaveToPaletteEntry[], signal?: AbortSignal): Promise<void> => {
    const {
      imageFile,
      samplingArea: defaultSamplingArea,
      paletteColorMixtures: prevPaletteColorMixtures,
      selectedPaletteColorMixtures: prevSelected,
    } = get();

    const paletteColorMixtures = new Map<string, ColorMixture>(prevPaletteColorMixtures);
    let selectedPaletteColorMixtures = prevSelected;

    set({
      isPaletteLoading: true,
    });

    try {
      const merged = new Map<string, SaveToPaletteEntry>();
      for (const e of entries) {
        if (!merged.has(e.colorMixture.key)) {
          merged.set(e.colorMixture.key, e);
        }
      }

      for (const entry of merged.values()) {
        if (signal?.aborted) {
          throw createAbortError();
        }
        const {key} = entry.colorMixture;
        const existing = paletteColorMixtures.get(key);
        const id = entry.colorMixture.id ?? existing?.id;
        const isNew = !id;
        const colorMixture: ColorMixture = {
          ...existing,
          ...entry.colorMixture,
          ...(isNew && (entry.linkToImage ?? true)
            ? {
                imageFileId: imageFile?.id,
                samplingArea: entry.samplingArea ?? defaultSamplingArea,
              }
            : {}),
          ...(id ? {id} : {}),
        };
        await saveColorMixture(colorMixture);

        paletteColorMixtures.set(key, colorMixture);

        if (selectedPaletteColorMixtures.has(key)) {
          if (selectedPaletteColorMixtures === prevSelected) {
            selectedPaletteColorMixtures = new Map(prevSelected);
          }
          selectedPaletteColorMixtures.set(key, colorMixture);
        }
      }
    } finally {
      set({
        paletteColorMixtures,
        selectedPaletteColorMixtures,
        isPaletteLoading: false,
      });
    }
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

    set({
      isPaletteLoading: true,
    });
    try {
      const {id: idToDelete} = colorMixture;
      if (idToDelete) {
        await deleteColorMixture(idToDelete);
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
    } finally {
      set({
        isPaletteLoading: false,
      });
    }
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

    set({
      isPaletteLoading: true,
    });
    try {
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
    } finally {
      set({
        isPaletteLoading: false,
      });
    }
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
