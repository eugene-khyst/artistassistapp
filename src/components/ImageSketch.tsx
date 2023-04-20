/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Spin} from 'antd';
import {Remote, wrap} from 'comlink';
import {useZoomableImageCanvas} from '../hooks/';
import {ZoomableImageCanvas} from '../services/canvas/image';
import {Sketch} from '../services/image';

const sketch: Remote<Sketch> = wrap(
  new Worker(new URL('../services/image/worker/sketch-worker.ts', import.meta.url), {
    type: 'module',
  })
);

const MEDIAN_FILTER_RADIUS = 4;

const zoomableImageCanvasSupplier = (canvas: HTMLCanvasElement): ZoomableImageCanvas => {
  return new ZoomableImageCanvas(canvas, {
    getImages: async (file): Promise<ImageBitmap[]> => [
      (await sketch.getSketch(file, MEDIAN_FILTER_RADIUS)).sketch,
    ],
  });
};

type Props = {
  file?: File;
};

export const ImageSketch: React.FC<Props> = ({file}: Props) => {
  const {ref: canvasRef, isLoading} = useZoomableImageCanvas<ZoomableImageCanvas>(
    zoomableImageCanvasSupplier,
    file
  );

  return (
    <Spin spinning={isLoading} tip="Loading" size="large" delay={300}>
      <canvas ref={canvasRef} style={{width: '100%', height: `calc(100vh - 75px)`}} />
    </Spin>
  );
};
