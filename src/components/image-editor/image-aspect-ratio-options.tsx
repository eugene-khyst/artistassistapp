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

import {Trans} from '@lingui/react/macro';

import {IMAGE_ASPECT_RATIOS, imageAspectRatioLabel} from '@/services/image/aspect-ratio';

export const IMAGE_ASPECT_RATIO_OPTIONS = IMAGE_ASPECT_RATIOS.map(aspectRatio => {
  const value = imageAspectRatioLabel(aspectRatio);
  switch (value) {
    // 100x148 mm is Canon Selphy Postcard and Xiaomi 6-inch photo paper.
    case '100:148':
      return {value, label: <Trans>100×148 mm photo paper</Trans>};
    case '148:100':
      return {value, label: <Trans>148×100 mm photo paper</Trans>};
    default:
      return {value, label: value};
  }
});
