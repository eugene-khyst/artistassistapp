/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Grid} from 'antd';
import {MutableRefObject, RefCallback, useCallback, useEffect, useRef} from 'react';
import {useDebounce, useWindowSize} from 'usehooks-ts';
import {useVisibilityChange} from '.';
import {ZoomableImageCanvas} from '../services/canvas/image';

export function zoomableImageCanvasSupplier(canvas: HTMLCanvasElement): ZoomableImageCanvas {
  return new ZoomableImageCanvas(canvas);
}

interface Result<T> {
  ref: RefCallback<HTMLCanvasElement>;
  zoomableImageCanvasRef: MutableRefObject<T | undefined>;
}

export function useZoomableImageCanvas<T extends ZoomableImageCanvas>(
  zoomableImageCanvasSupplier: (canvas: HTMLCanvasElement) => T,
  images: ImageBitmap[]
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

  useEffect(() => {
    const zoomableImageCanvas = zoomableImageCanvasRef.current;
    if (!zoomableImageCanvas || !isVisible || !windowSize.height) {
      return;
    }
    zoomableImageCanvas.resize();
  }, [windowSize, isVisible, screens]);

  useEffect(() => {
    const zoomableImageCanvas = zoomableImageCanvasRef.current;
    if (!zoomableImageCanvas || !images) {
      return;
    }
    zoomableImageCanvas.setImages(images);
  }, [images]);

  return {
    ref,
    zoomableImageCanvasRef,
  };
}
