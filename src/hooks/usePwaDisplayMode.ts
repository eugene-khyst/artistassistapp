/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
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
    return () => mediaQuery.removeEventListener('change', changeListener);
  }, []);

  return displayMode;
}
