/**
 * ArtistAssistApp
 * Copyright (C) 2023-2024  Eugene Khyst
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

import {API_URL} from '~/src/config';
import type {AdsDefinition} from '~/src/services/ads/types';
import {fetchSWR} from '~/src/utils';

export async function fetchAds(): Promise<AdsDefinition> {
  const response = await fetchSWR(`${API_URL}/ads.json`);
  return (await response.json()) as AdsDefinition;
}
