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

import {useEffect, useState} from 'react';

import {DisplayMode, getDisplayMode} from '~/src/utils';

export function useDisplayMode() {
  const [displayMode, setDisplayMode] = useState<DisplayMode>(() => getDisplayMode());

  useEffect(() => {
    const changeListener = (e: MediaQueryListEvent) => {
      let displayMode: DisplayMode = DisplayMode.BROWSER;
      if (e.matches) {
        displayMode = DisplayMode.STANDALONE;
      }
      setDisplayMode(displayMode);
    };
    const mediaQuery: MediaQueryList = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener('change', changeListener);
    return () => {
      mediaQuery.removeEventListener('change', changeListener);
    };
  }, []);

  return displayMode;
}
