/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Grid} from 'antd';
import {MutableRefObject, RefCallback, useCallback, useEffect, useRef, useState} from 'react';
import {useDebounce, useWindowSize} from 'usehooks-ts';
import {useVisibilityChange} from '.';
import {ZoomableImageCanvas} from '../services/canvas/image';

interface Result<T> {
  ref: RefCallback<HTMLCanvasElement>;
  isLoading: boolean;
  zoomableImageCanvasRef: MutableRefObject<T | undefined>;
}

export function useZoomableImageCanvas<T extends ZoomableImageCanvas>(
  zoomableImageCanvasSupplier: (canvas: HTMLCanvasElement) => T,
  blob?: Blob
): Result<T> {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const zoomableImageCanvasRef = useRef<T>();
  const ref = useCallback(
    (node: HTMLCanvasElement | null) => {
      zoomableImageCanvasRef.current?.destroy();
      zoomableImageCanvasRef.current = undefined;
      if (node) {
        canvasRef.current = node;
        zoomableImageCanvasRef.current = zoomableImageCanvasSupplier(node);
      }
    },
    [zoomableImageCanvasSupplier]
  );
  const isVisible = useVisibilityChange(canvasRef);
  const windowSize = useDebounce(useWindowSize(), 300);
  const screens = Grid.useBreakpoint();
  const [fileLoadingCount, setFileLoadingCount] = useState<number>(0);

  useEffect(() => {
    const zoomableImageCanvas = zoomableImageCanvasRef.current;
    if (!zoomableImageCanvas || !isVisible || !windowSize.height) {
      return;
    }
    const {canvas} = zoomableImageCanvas;
    zoomableImageCanvas.setSize(canvas.offsetWidth, canvas.offsetHeight);
  }, [windowSize, isVisible, screens]);

  useEffect(() => {
    (async () => {
      const zoomableImageCanvas = zoomableImageCanvasRef.current;
      if (!zoomableImageCanvas || !blob) {
        return;
      }
      setFileLoadingCount((prev: number) => prev + 1);
      await zoomableImageCanvas.setBlob(blob);
      setFileLoadingCount((prev: number) => prev - 1);
    })();
  }, [blob]);

  return {
    ref,
    isLoading: fileLoadingCount > 0,
    zoomableImageCanvasRef,
  };
}
