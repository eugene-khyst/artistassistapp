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

import type {RefObject} from 'react';
import {useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';

interface UseArModeOptions {
  isActive: boolean;
  onPermissionDenied?: () => void;
}

interface Result {
  isArMode: boolean;
  videoRef: RefObject<HTMLVideoElement | null>;
  enter: () => Promise<boolean>;
  exit: () => void;
}

export function useArMode({isActive, onPermissionDenied}: UseArModeOptions): Result {
  const [isArMode, setIsArMode] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isRequestingRef = useRef<boolean>(false);
  const isActiveRef = useRef<boolean>(isActive);
  const isMountedRef = useRef<boolean>(true);
  const onPermissionDeniedRef = useRef(onPermissionDenied);

  useEffect(() => {
    onPermissionDeniedRef.current = onPermissionDenied;
  }, [onPermissionDenied]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => {
      track.stop();
    });
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const exit = useCallback(() => {
    setIsArMode(false);
    stopStream();
  }, [stopStream]);

  const [prevIsActive, setPrevIsActive] = useState(isActive);
  if (isActive !== prevIsActive) {
    setPrevIsActive(isActive);
    if (!isActive) {
      setIsArMode(false);
    }
  }

  // Keep the ref current before a pending getUserMedia continuation can read it.
  useLayoutEffect(() => {
    isActiveRef.current = isActive;
    if (!isActive) {
      stopStream();
    }
  }, [isActive, stopStream]);

  const enter = useCallback(async (): Promise<boolean> => {
    if (!isActive || isRequestingRef.current || isArMode) {
      return isArMode;
    }
    isRequestingRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {facingMode: {ideal: 'environment'}},
      });
      if (!isMountedRef.current || !isActiveRef.current) {
        stream.getTracks().forEach(track => {
          track.stop();
        });
        return false;
      }
      streamRef.current = stream;
      setIsArMode(true);
      return true;
    } catch {
      if (isMountedRef.current) {
        onPermissionDeniedRef.current?.();
      }
      return false;
    } finally {
      isRequestingRef.current = false;
    }
  }, [isActive, isArMode]);

  useEffect(() => {
    if (isArMode && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isArMode]);

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  return {isArMode, videoRef, enter, exit};
}
