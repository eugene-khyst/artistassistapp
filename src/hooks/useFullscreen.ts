/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {useCallback, useState} from 'react';

interface Result {
  isFullscreen: boolean;
  toggleFullScreen: () => void;
}

export function useFullScreen(): Result {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => !!document.fullscreenElement);

  const toggleFullScreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  return {
    isFullscreen,
    toggleFullScreen,
  };
}
