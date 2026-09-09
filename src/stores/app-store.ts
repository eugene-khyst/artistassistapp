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

import {create} from 'zustand';
import {subscribeWithSelector} from 'zustand/middleware';

import {type AuthSlice, createAuthSlice} from '@/stores/auth-slice';
import {type CloudSlice, createCloudSlice} from '@/stores/cloud-slice';
import {
  type ColorMatchImageSlice,
  createColorMatchImageSlice,
} from '@/stores/color-match-image-slice';
import {
  type ColorMixingChartSlice,
  createColorMixingChartSlice,
} from '@/stores/color-mixing-chart-slice';
import {type ColorizeSlice, createColorizeSlice} from '@/stores/colorize-slice';
import {createEditImageSlice, type EditImageSlice} from '@/stores/edit-image-slice';
import {createExpandImageSlice, type ExpandImageSlice} from '@/stores/expand-image-slice';
import {createLocaleSlice, type LocaleSlice} from '@/stores/locale-slice';
import {
  createPosterizedImageSlice,
  type PosterizedImageSlice,
} from '@/stores/posterized-image-slice';
import {createPwaSlice, type PwaSlice} from '@/stores/pwa-slice';
import {createRemoveObjectsSlice, type RemoveObjectsSlice} from '@/stores/remove-objects-slice';

import {type AdjustColorsSlice, createAdjustColorsSlice} from './adjust-colors-slice';
import {type AppSlice, createAppSlice} from './app-slice';
import {type ColorMixerSlice, createColorMixerSlice} from './color-mixer-slice';
import {type ColorSetSlice, createColorSetSlice} from './color-set-slice';
import {createCropSlice, type CropSlice} from './crop-slice';
import {createCustomColorBrandSlice, type CustomColorBrandSlice} from './custom-color-brand-slice';
import {
  createLimitedPaletteImageSlice,
  type LimitedPaletteImageSlice,
} from './limited-palette-image-slice';
import {createOriginalImageSlice, type OriginalImageSlice} from './original-image-slice';
import {createOutlineImageSlice, type OutlineImageSlice} from './outline-image-slice';
import {createPaletteSlice, type PaletteSlice} from './palette-slice';
import {createRemoveBackgroundSlice, type RemoveBackgroundSlice} from './remove-background-slice';
import {createRestoreSlice, type RestoreSlice} from './restore-slice';
import {createSimplifyImageSlice, type SimplifyImageSlice} from './simplify-image-slice';
import {createStorageSlice, type StorageSlice} from './storage-slice';
import {createStraightenSlice, type StraightenSlice} from './straighten-slice';
import {createStyleTransferSlice, type StyleTransferSlice} from './style-transfer-slice';
import {createTabSlice, type TabSlice} from './tab-slice';
import {createTonalValuesSlice, type TonalValuesSlice} from './tonal-values-slice';
import {createTournamentSlice, type TournamentSlice} from './tournament-slice';
import {createUpscaleSlice, type UpscaleSlice} from './upscale-slice';

export const useAppStore = create<
  PwaSlice &
    LocaleSlice &
    AuthSlice &
    CloudSlice &
    TabSlice &
    ColorSetSlice &
    ColorMixerSlice &
    ColorMixingChartSlice &
    OriginalImageSlice &
    PosterizedImageSlice &
    ColorMatchImageSlice &
    PaletteSlice &
    TonalValuesSlice &
    SimplifyImageSlice &
    OutlineImageSlice &
    LimitedPaletteImageSlice &
    StyleTransferSlice &
    StraightenSlice &
    CropSlice &
    ExpandImageSlice &
    AdjustColorsSlice &
    RemoveBackgroundSlice &
    RemoveObjectsSlice &
    UpscaleSlice &
    RestoreSlice &
    ColorizeSlice &
    EditImageSlice &
    TournamentSlice &
    CustomColorBrandSlice &
    StorageSlice &
    AppSlice
>()(
  subscribeWithSelector((...a) => ({
    ...createPwaSlice(...a),
    ...createLocaleSlice(...a),
    ...createAuthSlice(...a),
    ...createCloudSlice(...a),
    ...createTabSlice(...a),
    ...createColorSetSlice(...a),
    ...createColorMixerSlice(...a),
    ...createColorMixingChartSlice(...a),
    ...createOriginalImageSlice(...a),
    ...createPosterizedImageSlice(...a),
    ...createColorMatchImageSlice(...a),
    ...createPaletteSlice(...a),
    ...createTonalValuesSlice(...a),
    ...createSimplifyImageSlice(...a),
    ...createOutlineImageSlice(...a),
    ...createLimitedPaletteImageSlice(...a),
    ...createStyleTransferSlice(...a),
    ...createStraightenSlice(...a),
    ...createCropSlice(...a),
    ...createExpandImageSlice(...a),
    ...createAdjustColorsSlice(...a),
    ...createRemoveBackgroundSlice(...a),
    ...createRemoveObjectsSlice(...a),
    ...createUpscaleSlice(...a),
    ...createRestoreSlice(...a),
    ...createColorizeSlice(...a),
    ...createEditImageSlice(...a),
    ...createTournamentSlice(...a),
    ...createCustomColorBrandSlice(...a),
    ...createStorageSlice(...a),
    ...createAppSlice(...a),
  }))
);
