/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Grid} from 'antd';
import {RefCallback, useCallback, useEffect, useRef, useState} from 'react';
import {useWindowSize} from 'usehooks-ts';
import {useVisibilityChange} from '.';
import {ZoomableImageCanvas} from '~/src/services/canvas/image';

export function zoomableImageCanvasSupplier(canvas: HTMLCanvasElement): ZoomableImageCanvas {
  return new ZoomableImageCanvas(canvas);
}

interface Result<T> {
  ref: RefCallback<HTMLCanvasElement>;
  zoomableImageCanvas: T | undefined;
}

export function useZoomableImageCanvas<T extends ZoomableImageCanvas>(
  zoomableImageCanvasSupplier: (canvas: HTMLCanvasElement) => T,
  images: ImageBitmap[]
): Result<T> {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoomableImageCanvas, setZoomableImageCanvas] = useState<T | undefined>();
  const ref = useCallback(
    (node: HTMLCanvasElement | null) => {
      if (node) {
        canvasRef.current = node;
        setZoomableImageCanvas(prev => {
          prev?.destroy();
          return zoomableImageCanvasSupplier(node);
        });
      }
    },
    [zoomableImageCanvasSupplier]
  );
  const isVisible = useVisibilityChange(canvasRef);
  const windowSize = useWindowSize({debounceDelay: 300});
  const screens = Grid.useBreakpoint();

  useEffect(() => {
    if (!zoomableImageCanvas || !isVisible || !windowSize.height) {
      return;
    }
    zoomableImageCanvas.resize();
  }, [zoomableImageCanvas, windowSize, isVisible, screens]);

  useEffect(() => {
    if (!zoomableImageCanvas || !images) {
      return;
    }
    zoomableImageCanvas.setImages(images);
  }, [zoomableImageCanvas, images]);

  return {
    ref,
    zoomableImageCanvas,
  };
}
