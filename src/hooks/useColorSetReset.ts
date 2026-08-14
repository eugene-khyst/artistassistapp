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
  type ColorId,
  includesAllColorIds,
  isColorSetEqual,
  toColorIds,
} from '@eugene-khyst/artistassistapp-color-mixer';
import {useState} from 'react';

import {useAppStore} from '@/stores/app-store';

// `reset` runs during render, possibly twice, so it must be idempotent.
export function useColorSetReset(colorIds: readonly ColorId[], reset: () => void): number {
  const colorSet = useAppStore(state => state.colorSet);

  const [prevColorSet, setPrevColorSet] = useState(colorSet);
  const [revision, setRevision] = useState(0);
  if (colorSet !== prevColorSet) {
    setPrevColorSet(colorSet);
    if (
      !isColorSetEqual(colorSet, prevColorSet) &&
      (colorSet?.type !== prevColorSet?.type ||
        !includesAllColorIds(toColorIds(colorSet?.colors), colorIds))
    ) {
      setRevision(revision + 1);
      reset();
    }
  }
  return revision;
}
