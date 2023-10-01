/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {CheckboxOptionType, Radio, RadioChangeEvent, Spin} from 'antd';
import {Remote, wrap} from 'comlink';
import {useEffect, useState} from 'react';
import {useZoomableImageCanvas} from '../hooks/';
import {ZoomableImageCanvas} from '../services/canvas/image';
import {TonalValues} from '../services/image';

const tonalValues: Remote<TonalValues> = wrap(
  new Worker(new URL('../services/image/worker/tonal-values-worker.ts', import.meta.url), {
    type: 'module',
  })
);

const TONES_OPTIONS: CheckboxOptionType[] = [
  {value: -1, label: 'Highlight', disabled: true},
  {value: 0, label: 'Light tone'},
  {value: 1, label: 'Mid tone'},
  {value: 2, label: 'Shadow'},
];
const THRESHOLDS = [75, 50, 25];
const MEDIAN_FILTER_RADIUS = 3;

const zoomableImageCanvasSupplier = (canvas: HTMLCanvasElement): ZoomableImageCanvas => {
  return new ZoomableImageCanvas(canvas, {
    getImages: async (file): Promise<ImageBitmap[]> =>
      (await tonalValues.getTones(file, THRESHOLDS, MEDIAN_FILTER_RADIUS)).tones,
  });
};

type Props = {
  file?: File;
};

export const ImageTonalValues: React.FC<Props> = ({file}: Props) => {
  const {
    ref: canvasRef,
    isLoading,
    zoomableImageCanvasRef,
  } = useZoomableImageCanvas<ZoomableImageCanvas>(zoomableImageCanvasSupplier, file);
  const [imageIndex, setImageIndex] = useState<number>(0);

  useEffect(() => {
    zoomableImageCanvasRef.current?.setImageIndex(imageIndex);
  }, [zoomableImageCanvasRef, imageIndex]);

  return (
    <Spin spinning={isLoading} tip="Loading" size="large" delay={300}>
      <div style={{textAlign: 'center'}}>
        <Radio.Group
          options={TONES_OPTIONS}
          value={imageIndex}
          onChange={(e: RadioChangeEvent) => setImageIndex(e.target.value)}
          optionType="button"
          buttonStyle="solid"
          style={{marginBottom: 8}}
        />
      </div>
      <div>
        <canvas ref={canvasRef} style={{width: '100%', height: `calc(100vh - 115px)`}} />
      </div>
    </Spin>
  );
};
