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

import type {MessageDescriptor} from '@lingui/core';
import {defineMessage} from '@lingui/core/macro';

import {ColorType} from '~/src/services/color/types';
import {TabKey} from '~/src/tabs';

export const TAB_LABELS: Record<TabKey, MessageDescriptor> = {
  [TabKey.ColorSet]: defineMessage`Color set`,
  [TabKey.Photo]: defineMessage`Photo`,
  [TabKey.ColorPicker]: defineMessage`Color picker`,
  [TabKey.Palette]: defineMessage`Palette`,
  [TabKey.TonalValues]: defineMessage`Tonal values`,
  [TabKey.SimplifiedPhoto]: defineMessage`Simplified`,
  [TabKey.Outline]: defineMessage`Outline`,
  [TabKey.Grid]: defineMessage`Grid`,
  [TabKey.ColorMixing]: defineMessage`Color mixing`,
  [TabKey.LimitedPalette]: defineMessage`Limited palette`,
  [TabKey.StyleTransfer]: defineMessage`Inspire`,
  [TabKey.ColorCorrection]: defineMessage`White balance`,
  [TabKey.BackgroundRemove]: defineMessage`Remove background`,
  [TabKey.Compare]: defineMessage`Compare`,
  [TabKey.Install]: defineMessage`Install`,
  [TabKey.CustomColorBrand]: defineMessage`Custom brand`,
  [TabKey.Help]: defineMessage`Help`,
};

export const COLOR_TYPE_LABELS: Record<ColorType, MessageDescriptor> = {
  [ColorType.WatercolorPaint]: defineMessage`Watercolor Paint`,
  [ColorType.Gouache]: defineMessage`Gouache`,
  [ColorType.AcrylicPaint]: defineMessage`Acrylic Paint`,
  [ColorType.OilPaint]: defineMessage`Oil Paint`,
  [ColorType.ColoredPencils]: defineMessage`Colored Pencils`,
  [ColorType.WatercolorPencils]: defineMessage`Watercolor Pencils`,
  [ColorType.Pastel]: defineMessage`Pastel`,
  [ColorType.OilPastel]: defineMessage`Oil Pastel`,
  [ColorType.AcrylicMarkers]: defineMessage`Acrylic Markers`,
  [ColorType.AcrylicGouache]: defineMessage`Acrylic Gouache`,
};

export const AUTH_ERROR_MESSAGES: Record<string, MessageDescriptor> = {
  inactive: defineMessage`You have not yet joined ArtistAssistApp on Patreon as a paid member. Join and log in again.`,
  expired: defineMessage`Your session has expired. Please log in again.`,
  invalid_token: defineMessage`Failed to verify the ID token.`,
};

export const PERSISTENT_STORAGE_WARN = {
  title: defineMessage`Persistent storage is not enabled`,
  content: defineMessage`Your data may not be saved reliably if the browser is closed. To fix this, install the app as described in the Install tab, or use a different browser such as Chrome or Firefox.`,
};
