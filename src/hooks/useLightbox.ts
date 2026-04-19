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

import {useCallback, useEffect, useRef, useState} from 'react';

import {useFullScreen} from '~/src/hooks/useFullscreen';

interface Options {
  onEnter?: () => void;
}

interface Result {
  isLightbox: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  open: () => Promise<void>;
  close: () => Promise<void>;
}

export function useLightbox({onEnter}: Options = {}): Result {
  const [isLightbox, setIsLightbox] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const enteredFullscreenRef = useRef<boolean>(false);
  const isOpeningRef = useRef<boolean>(false);

  const {isSupported: isFullScreenSupported} = useFullScreen();

  const close = useCallback(async () => {
    setIsLightbox(false);
    const orientation = screen.orientation as ScreenOrientation & {
      unlock?: () => void;
    };
    if (typeof orientation.unlock === 'function') {
      try {
        orientation.unlock();
      } catch {
        // ignore
      }
    }
    if (enteredFullscreenRef.current && document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        // ignore
      }
    }
    enteredFullscreenRef.current = false;
  }, []);

  const open = useCallback(async () => {
    if (isOpeningRef.current) {
      return;
    }
    isOpeningRef.current = true;
    try {
      onEnter?.();
      setIsLightbox(true);
      let enteredFullscreen = false;
      const target = containerRef.current;
      if (isFullScreenSupported && target && !document.fullscreenElement) {
        try {
          await target.requestFullscreen();
          enteredFullscreen = true;
        } catch {
          // ignore
        }
      }
      enteredFullscreenRef.current = enteredFullscreen;
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (orientation: OrientationType) => Promise<void>;
      };
      if (typeof orientation.lock === 'function') {
        try {
          await orientation.lock(orientation.type);
        } catch {
          // ignore
        }
      }
    } finally {
      isOpeningRef.current = false;
    }
  }, [isFullScreenSupported, onEnter]);

  useEffect(() => {
    if (!isLightbox) {
      return;
    }
    const handleFullscreenChange = () => {
      if (enteredFullscreenRef.current && !document.fullscreenElement) {
        void close();
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isLightbox, close]);

  return {isLightbox, containerRef, open, close};
}
