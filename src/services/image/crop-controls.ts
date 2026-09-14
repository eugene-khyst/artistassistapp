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

import {
  type CropAspectRatio,
  FREE_CROP_ASPECT_RATIO,
  imageAspectRatio,
  imageAspectRatioLabel,
  ORIGINAL_CROP_ASPECT_RATIO,
} from '@/services/image/aspect-ratio';
import type {AppSettings} from '@/services/settings/types';

export function cropAspectRatioFromAppSettings(appSettings: AppSettings): CropAspectRatio {
  if (appSettings.cropAspectRatio === FREE_CROP_ASPECT_RATIO) {
    return null;
  }
  if (appSettings.cropAspectRatio === ORIGINAL_CROP_ASPECT_RATIO) {
    return ORIGINAL_CROP_ASPECT_RATIO;
  }
  return imageAspectRatio(appSettings.cropAspectRatio ?? '') ?? null;
}

export function cropAspectRatioToAppSettings(aspectRatio: CropAspectRatio): Partial<AppSettings> {
  if (aspectRatio === null) {
    return {cropAspectRatio: FREE_CROP_ASPECT_RATIO};
  }
  if (aspectRatio === ORIGINAL_CROP_ASPECT_RATIO) {
    return {cropAspectRatio: ORIGINAL_CROP_ASPECT_RATIO};
  }
  return {cropAspectRatio: imageAspectRatioLabel(aspectRatio)};
}
