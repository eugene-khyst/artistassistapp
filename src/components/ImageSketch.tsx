/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {CheckboxOptionType, Form, Radio, RadioChangeEvent, Spin} from 'antd';
import {Remote, wrap} from 'comlink';
import {useEffect, useState} from 'react';
import {useZoomableImageCanvas, zoomableImageCanvasSupplier} from '../hooks/';
import {useCreateImageBitmap} from '../hooks/useCreateImageBitmap';
import {ZoomableImageCanvas} from '../services/canvas/image';
import {Sketch} from '../services/image';

const sketch: Remote<Sketch> = wrap(
  new Worker(new URL('../services/image/worker/sketch-worker.ts', import.meta.url), {
    type: 'module',
  })
);

const MEDIAN_FILTER_RADIUS_OPTIONS: CheckboxOptionType<number>[] = [
  {value: 0, label: 'None'},
  {value: 1, label: 'Small'},
  {value: 2, label: 'Medium'},
  {value: 3, label: 'Large'},
];
const MEDIAN_FILTER_RADIUSES = [0, 2, 3, 4];

const blobToImageBitmapsConverter = async (blob: Blob): Promise<ImageBitmap[]> => {
  const {sketches} = await sketch.getSketches(blob, MEDIAN_FILTER_RADIUSES);
  return sketches;
};

type Props = {
  blob?: Blob;
};

export const ImageSketch: React.FC<Props> = ({blob}: Props) => {
  const {images, isLoading} = useCreateImageBitmap(blobToImageBitmapsConverter, blob);

  const {ref: canvasRef, zoomableImageCanvasRef} = useZoomableImageCanvas<ZoomableImageCanvas>(
    zoomableImageCanvasSupplier,
    images
  );

  const [sketchImageIndex, setSketchImageIndex] = useState<number>(1);

  useEffect(() => {
    zoomableImageCanvasRef.current?.setImageIndex(sketchImageIndex);
  }, [zoomableImageCanvasRef, sketchImageIndex]);

  const handleBlurChange = (e: RadioChangeEvent) => {
    setSketchImageIndex(e.target.value);
  };

  return (
    <Spin spinning={isLoading} tip="Loading" size="large" delay={300}>
      <div style={{display: 'flex', width: '100%', justifyContent: 'center', marginBottom: 8}}>
        <Form.Item
          label="Blur"
          tooltip="Controls the radius of the median filter."
          style={{marginBottom: 0}}
        >
          <Radio.Group
            options={MEDIAN_FILTER_RADIUS_OPTIONS}
            value={sketchImageIndex}
            onChange={handleBlurChange}
            optionType="button"
            buttonStyle="solid"
          />
        </Form.Item>
      </div>
      <div>
        <canvas ref={canvasRef} style={{width: '100%', height: `calc(100vh - 115px)`}} />
      </div>
    </Spin>
  );
};
