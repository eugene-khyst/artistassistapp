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

import {type RefCallback, useCallback, useEffect, useRef, useState} from 'react';

import {
  ZoomableImageCanvas,
  type ZoomableImageCanvasProps,
} from '@/services/canvas/image/zoomable-image-canvas';
import type {CanvasMode} from '@/services/canvas/mode/canvas-mode';
import type {Rectangle} from '@/services/math/geometry';
import {debounce} from '@/utils/debounce';

interface CanvasInstance<T extends CanvasMode | null> {
  zoomableImageCanvas: ZoomableImageCanvas;
  canvasMode: T;
}

interface Result<T extends CanvasMode | null> {
  ref: RefCallback<HTMLCanvasElement>;
  zoomableImageCanvas?: ZoomableImageCanvas;
  canvasMode?: T;
}

export function useZoomableImageCanvas<T extends CanvasMode | null>(
  canvasModeSupplier: () => T,
  images: (ImageBitmap | null | undefined) | (ImageBitmap | null | undefined)[],
  sourceKey: unknown,
  displayDimension?: Rectangle,
  {allowZoomBelowFit, maxZoom, zoomFactor, imageSmoothingEnabled}: ZoomableImageCanvasProps = {}
): Result<T> {
  const [instance, setInstance] = useState<CanvasInstance<T>>();
  const sourceKeyRef = useRef(sourceKey);
  const ref = useCallback(
    (node: HTMLCanvasElement | null) => {
      if (!node) {
        setInstance(undefined);
        return;
      }
      const zoomableImageCanvas = new ZoomableImageCanvas(node, {
        allowZoomBelowFit,
        maxZoom,
        zoomFactor,
        imageSmoothingEnabled,
      });
      const canvasMode = canvasModeSupplier();
      zoomableImageCanvas.setMode(canvasMode);
      setInstance({zoomableImageCanvas, canvasMode});
    },
    [allowZoomBelowFit, canvasModeSupplier, imageSmoothingEnabled, maxZoom, zoomFactor]
  );

  useEffect(() => {
    const listener = debounce(() => instance?.zoomableImageCanvas.resize());
    window.addEventListener('resize', listener);
    return () => {
      instance?.zoomableImageCanvas.destroy();
      const canvasMode: CanvasMode | null = instance?.canvasMode ?? null;
      canvasMode?.destroy();
      window.removeEventListener('resize', listener);
    };
  }, [instance]);

  useEffect(() => {
    const zoomableImageCanvas = instance?.zoomableImageCanvas;
    if (!('IntersectionObserver' in window) || !zoomableImageCanvas) {
      return;
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          zoomableImageCanvas.resize();
        }
      });
    });
    observer.observe(zoomableImageCanvas.canvas);
    return () => {
      observer.disconnect();
    };
  }, [instance]);

  useEffect(() => {
    const zoomableImageCanvas = instance?.zoomableImageCanvas;
    if (!zoomableImageCanvas) {
      return;
    }
    const sourceChanged = !Object.is(sourceKeyRef.current, sourceKey);
    const filteredImages = [images]
      .flat()
      .filter((image: ImageBitmap | null | undefined): image is ImageBitmap => !!image);
    zoomableImageCanvas.setImages(filteredImages, displayDimension);
    if (sourceChanged) {
      zoomableImageCanvas.zoomToFit();
    }
    sourceKeyRef.current = sourceKey;
  }, [instance, images, sourceKey, displayDimension]);

  return {
    ref,
    zoomableImageCanvas: instance?.zoomableImageCanvas,
    canvasMode: instance?.canvasMode,
  };
}
