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

import type {ColorMixture, ColorType, SamplingArea} from '@/services/color/types';
import {
  deleteColorMixture,
  getColorMixturesByDigest,
  saveColorMixture,
} from '@/services/db/color-mixture-db';
import type {AppSlice} from '@/stores/app-slice';
import type {CloudSlice} from '@/stores/cloud-slice';
import {persistChange} from '@/stores/sync/persist-change';
import {computeIfAbsentInMap} from '@/utils/map';
import {createAbortError} from '@/utils/promise';

import type {ColorMixerSlice} from './color-mixer-slice';
import type {OriginalImageSlice} from './original-image-slice';

export interface SaveToPaletteEntry {
  colorMixture: ColorMixture;
  linkToImage?: boolean;
  samplingArea?: SamplingArea | null;
  preserveDate?: boolean;
}

function computeColorMixturesByType(
  colorMixtures: ColorMixture[]
): Map<ColorType, Map<string, ColorMixture>> {
  const colorMixturesByType = new Map<ColorType, Map<string, ColorMixture>>();
  for (const cm of colorMixtures) {
    computeIfAbsentInMap(colorMixturesByType, cm.type, () => new Map<string, ColorMixture>()).set(
      cm.key,
      cm
    );
  }
  return colorMixturesByType;
}

export interface PaletteSlice {
  paletteColorMixtures: Map<ColorType, Map<string, ColorMixture>>;
  selectedPaletteColorMixtures: Map<string, ColorMixture>;
  isPaletteLoading: boolean;

  loadPaletteColorMixtures: (options?: {signal?: AbortSignal}) => Promise<void>;
  saveToPalette: (options: SaveToPaletteEntry) => Promise<void>;
  saveToPaletteBulk: (entries: SaveToPaletteEntry[], signal?: AbortSignal) => Promise<void>;
  deleteFromPalette: (colorMixture: ColorMixture) => Promise<void>;
  deleteAllFromPalette: (type: ColorType) => Promise<void>;
  selectPaletteColorMixtures: (keys: string[]) => void;
}

type PaletteSliceDependencies = Pick<ColorMixerSlice, 'colorSet' | 'samplingArea'> &
  Pick<OriginalImageSlice, 'selectedImageFile'> &
  Pick<AppSlice, 'saveStoreChangeTokens'> &
  Pick<CloudSlice, 'pushCloudState'>;

export const createPaletteSlice: StateCreator<
  PaletteSlice & PaletteSliceDependencies,
  [],
  [],
  PaletteSlice
> = (set, get) => ({
  paletteColorMixtures: new Map(),
  selectedPaletteColorMixtures: new Map(),
  isPaletteLoading: false,

  loadPaletteColorMixtures: async ({signal} = {}): Promise<void> => {
    signal?.throwIfAborted();
    const {colorSet, selectedImageFile, selectedPaletteColorMixtures} = get();
    set({
      isPaletteLoading: true,
    });
    try {
      const paletteColorMixtures: ColorMixture[] = await getColorMixturesByDigest(
        selectedImageFile?.digest
      );
      signal?.throwIfAborted();
      const paletteColorMixturesByType = computeColorMixturesByType(paletteColorMixtures);
      const preservedSelection = new Map<string, ColorMixture>();
      if (colorSet) {
        for (const key of selectedPaletteColorMixtures.keys()) {
          const colorMixture = paletteColorMixturesByType.get(colorSet.type)?.get(key);
          if (colorMixture) {
            preservedSelection.set(key, colorMixture);
          }
        }
      }
      set({
        paletteColorMixtures: paletteColorMixturesByType,
        selectedPaletteColorMixtures: preservedSelection,
      });
    } finally {
      set({
        isPaletteLoading: false,
      });
    }
  },

  saveToPalette: async ({colorMixture, linkToImage, samplingArea, preserveDate}): Promise<void> => {
    await get().saveToPaletteBulk([
      {
        colorMixture,
        linkToImage,
        samplingArea: samplingArea ?? get().samplingArea,
        preserveDate,
      },
    ]);
  },

  saveToPaletteBulk: async (entries: SaveToPaletteEntry[], signal?: AbortSignal): Promise<void> => {
    const {
      selectedImageFile,
      paletteColorMixtures: prev,
      selectedPaletteColorMixtures: prevSelected,
    } = get();

    const paletteColorMixtures = new Map(prev);

    set({
      isPaletteLoading: true,
    });

    try {
      const types = new Set<ColorType>();
      const merged = new Map<string, SaveToPaletteEntry>();
      for (const entry of entries) {
        const {
          colorMixture: {type, key},
        } = entry;
        types.add(type);
        if (!merged.has(key)) {
          merged.set(key, entry);
        }
      }

      for (const type of types) {
        const colorMixturesForType = paletteColorMixtures.get(type);
        paletteColorMixtures.set(type, new Map(colorMixturesForType));
      }

      for (const entry of merged.values()) {
        if (signal?.aborted) {
          throw createAbortError();
        }
        const {type, key} = entry.colorMixture;
        const existing: ColorMixture | undefined = paletteColorMixtures.get(type)!.get(key);
        const id: number | undefined = entry.colorMixture.id ?? existing?.id;
        const isNew = !id;
        const colorMixture: ColorMixture = {
          ...existing,
          ...entry.colorMixture,
          ...(isNew && (entry.linkToImage ?? true)
            ? {
                imageFileDigest: selectedImageFile?.digest,
                samplingArea: entry.samplingArea,
              }
            : {}),
          ...(id ? {id} : {}),
        };
        await persistChange(get, () =>
          saveColorMixture(colorMixture, {
            preserveDate: entry.preserveDate,
          })
        );

        paletteColorMixtures.get(type)!.set(key, colorMixture);
      }
    } finally {
      set({
        paletteColorMixtures,
        isPaletteLoading: false,
      });
      get().selectPaletteColorMixtures([...prevSelected.keys()]);
    }
  },

  deleteFromPalette: async ({type, key}: ColorMixture): Promise<void> => {
    const {paletteColorMixtures: prev, selectedPaletteColorMixtures: prevSelected} = get();

    const colorMixture: ColorMixture | undefined = prev.get(type)?.get(key);
    if (!colorMixture) {
      return;
    }

    set({
      isPaletteLoading: true,
    });
    try {
      const {id: idToDelete} = colorMixture;
      if (idToDelete) {
        await persistChange(get, () => deleteColorMixture(idToDelete));
      }

      const paletteColorMixtures = new Map(prev);
      const colorMixturesForType = new Map(paletteColorMixtures.get(type));
      colorMixturesForType.delete(key);
      paletteColorMixtures.set(type, colorMixturesForType);

      let selectedPaletteColorMixtures = prevSelected;
      if (selectedPaletteColorMixtures.has(key)) {
        selectedPaletteColorMixtures = new Map(prevSelected);
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

  deleteAllFromPalette: async (type: ColorType): Promise<void> => {
    const {paletteColorMixtures: prev, selectedPaletteColorMixtures: prevSelected} = get();

    if (!prev.get(type)?.size) {
      return;
    }

    const keysToDelete: string[] = [...(prev.get(type)?.values() ?? [])].map(({key}) => key);

    set({
      isPaletteLoading: true,
    });
    try {
      for (const key of keysToDelete) {
        const colorMixture = prev.get(type)!.get(key);
        if (colorMixture?.id) {
          await persistChange(get, () => deleteColorMixture(colorMixture.id!));
        }
      }

      const paletteColorMixtures = new Map(prev);
      const colorMixturesForType = new Map(paletteColorMixtures.get(type));
      paletteColorMixtures.set(type, colorMixturesForType);

      let selectedPaletteColorMixtures = prevSelected;

      for (const key of keysToDelete) {
        colorMixturesForType.delete(key);

        if (selectedPaletteColorMixtures.has(key)) {
          if (selectedPaletteColorMixtures === prevSelected) {
            selectedPaletteColorMixtures = new Map(prevSelected);
          }
          selectedPaletteColorMixtures.delete(key);
        }
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
    const {paletteColorMixtures, colorSet} = get();
    if (!colorSet) {
      return;
    }
    const selectedPaletteColorMixtures = new Map<string, ColorMixture>(
      keys.flatMap((key: string): [string, ColorMixture][] => {
        const mixture: ColorMixture | undefined = paletteColorMixtures.get(colorSet.type)?.get(key);
        return mixture ? [[mixture.key, mixture]] : [];
      })
    );
    set({
      selectedPaletteColorMixtures,
    });
  },
});
