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

import {create} from 'zustand';

import type {AuthSlice} from '~/src/stores/auth-slice';
import {createAuthSlice} from '~/src/stores/auth-slice';
import {createLocaleSlice, type LocaleSlice} from '~/src/stores/locale-slice';

import {type AdjustedImageSlice, createAdjustedImageSlice} from './adjusted-image-slice';
import {
  type BackgroundRemovalSlice,
  createBackgroundRemovalSlice,
} from './background-removal-slice';
import {type BlurredImagesSlice, createBlurredImagesSlice} from './blurred-images-slice';
import {type ColorMixerSlice, createColorMixerSlice} from './color-mixer-slice';
import {type ColorSetSlice, createColorSetSlice} from './color-set-slice';
import {createCustomColorBrandSlice, type CustomColorBrandSlice} from './custom-color-brand-slice';
import {createInitSlice, type InitSlice} from './init-slice';
import {
  createLimitedPaletteImageSlice,
  type LimitedPaletteImageSlice,
} from './limited-palette-image-slice';
import {createOriginalImageSlice, type OriginalImageSlice} from './original-image-slice';
import {createOutlineImageSlice, type OutlineImageSlice} from './outline-image-slice';
import {createPaletteSlice, type PaletteSlice} from './palette-slice';
import {createStorageSlice, type StorageSlice} from './storage-slice';
import {createStyleTransferSlice, type StyleTransferSlice} from './style-transfer-slice';
import {createTabSlice, type TabSlice} from './tab-slice';
import {createTonalImagesSlice, type TonalImagesSlice} from './tonal-images-slice';
import {createTournamentSlice, type TournamentSlice} from './tournament-slice';

export const useAppStore = create<
  LocaleSlice &
    AuthSlice &
    TabSlice &
    ColorSetSlice &
    ColorMixerSlice &
    OriginalImageSlice &
    PaletteSlice &
    TonalImagesSlice &
    BlurredImagesSlice &
    OutlineImageSlice &
    LimitedPaletteImageSlice &
    StyleTransferSlice &
    AdjustedImageSlice &
    BackgroundRemovalSlice &
    TournamentSlice &
    CustomColorBrandSlice &
    StorageSlice &
    InitSlice
>()((...a) => ({
  ...createLocaleSlice(...a),
  ...createAuthSlice(...a),
  ...createTabSlice(...a),
  ...createColorSetSlice(...a),
  ...createColorMixerSlice(...a),
  ...createOriginalImageSlice(...a),
  ...createPaletteSlice(...a),
  ...createTonalImagesSlice(...a),
  ...createBlurredImagesSlice(...a),
  ...createOutlineImageSlice(...a),
  ...createLimitedPaletteImageSlice(...a),
  ...createStyleTransferSlice(...a),
  ...createAdjustedImageSlice(...a),
  ...createBackgroundRemovalSlice(...a),
  ...createTournamentSlice(...a),
  ...createCustomColorBrandSlice(...a),
  ...createStorageSlice(...a),
  ...createInitSlice(...a),
}));
