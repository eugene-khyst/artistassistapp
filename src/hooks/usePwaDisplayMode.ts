/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {useEffect, useState} from 'react';

export enum DisplayMode {
  BROWSER = 'browser',
  STANDALONE = 'standalone',
  TWA = 'twa',
}

function getPwaDisplayMode(): DisplayMode {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  if (document.referrer.startsWith('android-app://')) {
    return DisplayMode.TWA;
  } else if ('standalone' in navigator || isStandalone) {
    return DisplayMode.STANDALONE;
  }
  return DisplayMode.BROWSER;
}

export function usePwaDisplayMode() {
  const [displayMode, setDisplayMode] = useState<DisplayMode>(() => getPwaDisplayMode());

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
