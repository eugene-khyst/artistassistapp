/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import type {RefCallback} from 'react';
import {useCallback, useEffect, useRef, useState} from 'react';

import {ZoomableImageCanvas} from '~/src/services/canvas/image';
import {debounce} from '~/src/utils';

export function zoomableImageCanvasSupplier(canvas: HTMLCanvasElement): ZoomableImageCanvas {
  return new ZoomableImageCanvas(canvas);
}

interface Result<T> {
  ref: RefCallback<HTMLCanvasElement>;
  zoomableImageCanvas: T | undefined;
}

export function useZoomableImageCanvas<T extends ZoomableImageCanvas>(
  zoomableImageCanvasSupplier: (canvas: HTMLCanvasElement) => T,
  image: (ImageBitmap | null) | ImageBitmap[]
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

  useEffect(() => {
    const listener = debounce(() => zoomableImageCanvas?.resize());
    window.addEventListener('resize', listener);
    return () => window.removeEventListener('load', listener);
  }, [zoomableImageCanvas]);

  useEffect(() => {
    if (!('IntersectionObserver' in window) || !zoomableImageCanvas?.canvas) {
      return;
    }
    const observer = new IntersectionObserver((entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry: IntersectionObserverEntry) => {
        if (entry.isIntersecting) {
          zoomableImageCanvas.resize();
        }
      });
    });
    observer.observe(zoomableImageCanvas.canvas);
    return () => observer.disconnect();
  }, [zoomableImageCanvas]);

  useEffect(() => {
    if (!zoomableImageCanvas) {
      return;
    }
    zoomableImageCanvas.setImages(image ? [image].flat() : []);
  }, [zoomableImageCanvas, image]);

  return {
    ref,
    zoomableImageCanvas,
  };
}
