/**
 * ArtistAssistApp
 * Copyright (C) 2023-2025  Eugene Khyst
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

import type {RefCallback} from 'react';
import {useCallback, useEffect, useState} from 'react';

import {ZoomableImageCanvas} from '~/src/services/canvas/image/zoomable-image-canvas';
import {debounce} from '~/src/utils/debounce';

export function zoomableImageCanvasSupplier(canvas: HTMLCanvasElement): ZoomableImageCanvas {
  return new ZoomableImageCanvas(canvas);
}

interface Result<T> {
  ref: RefCallback<HTMLCanvasElement>;
  zoomableImageCanvas?: T;
}

export function useZoomableImageCanvas<T extends ZoomableImageCanvas>(
  zoomableImageCanvasSupplier: (canvas: HTMLCanvasElement) => T,
  image: (ImageBitmap | null | undefined) | (ImageBitmap | null | undefined)[]
): Result<T> {
  const [zoomableImageCanvas, setZoomableImageCanvas] = useState<T>();
  const ref = useCallback(
    (node: HTMLCanvasElement | null) => {
      if (node) {
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
    return () => {
      zoomableImageCanvas?.destroy();
      window.removeEventListener('load', listener);
    };
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
    return () => {
      observer.disconnect();
    };
  }, [zoomableImageCanvas]);

  useEffect(() => {
    if (!zoomableImageCanvas) {
      return;
    }
    zoomableImageCanvas.setImages(
      [image]
        .flat()
        .filter((image: ImageBitmap | null | undefined): image is ImageBitmap => !!image)
    );
  }, [zoomableImageCanvas, image]);

  return {
    ref,
    zoomableImageCanvas,
  };
}
