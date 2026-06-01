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

import {PAPER_WHITE_HEX} from '@/services/color/color-mixer';
import type {AppSettings} from '@/services/settings/types';
import {ColorPickerSort} from '@/services/settings/types';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  colorPickerSurfaceHex: PAPER_WHITE_HEX,
  colorPickerLayeringEnabled: true,
  colorPickerSort: ColorPickerSort.BySimilarity,
  autoSavingColorSetsJson: true,
};
