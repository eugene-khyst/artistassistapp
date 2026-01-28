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

export interface SampleImageDefinition {
  image: string;
  thumbnail: string;
  name: string;
  id: number;
}

export const SAMPLE_IMAGES: SampleImageDefinition[] = [
  {name: 'Chrysanthemum', id: -1000},
  {name: 'Sunset', id: -1001},
].map(
  ({name, id}): SampleImageDefinition => ({
    image: `/sample-images/${name.toLowerCase()}.webp`,
    thumbnail: `/sample-images/${name.toLowerCase()}-thumbnail.webp`,
    name,
    id,
  })
);
