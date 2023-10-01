/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Col, Form, Row, Slider, Spin} from 'antd';
import {SliderMarks} from 'antd/es/slider';
import {Remote, wrap} from 'comlink';
import {useContext, useEffect, useState} from 'react';
import {AppConfig, AppConfigContext} from '../context/AppConfigContext';
import {useZoomableImageCanvas} from '../hooks/';
import {ZoomableImageCanvas} from '../services/canvas/image';
import {Sketch} from '../services/image';
import {range} from '../utils';

const sketch: Remote<Sketch> = wrap(
  new Worker(new URL('../services/image/worker/sketch-worker.ts', import.meta.url), {
    type: 'module',
  })
);

const MIN_MEDIAN_FILTER_RADIUS = 2;
const MAX_MEDIAN_FILTER_RADIUS = 4;
const MEDIAN_FILTER_RADIUSES = range(MIN_MEDIAN_FILTER_RADIUS, MAX_MEDIAN_FILTER_RADIUS);

const zoomableImageCanvasSupplier = (canvas: HTMLCanvasElement): ZoomableImageCanvas => {
  return new ZoomableImageCanvas(canvas, {
    getImages: async (file): Promise<ImageBitmap[]> =>
      (await sketch.getSketches(file, MEDIAN_FILTER_RADIUSES)).sketches,
  });
};

type Props = {
  file?: File;
};

export const ImageSketch: React.FC<Props> = ({file}: Props) => {
  const {defaultMedianFilterSize} = useContext<AppConfig>(AppConfigContext);
  const medianFilterSizeSliderMarks: SliderMarks = Object.fromEntries(
    MEDIAN_FILTER_RADIUSES.map((i: number) => [i, i])
  );

  const {
    ref: canvasRef,
    isLoading,
    zoomableImageCanvasRef,
  } = useZoomableImageCanvas<ZoomableImageCanvas>(zoomableImageCanvasSupplier, file);

  const [medianFilterSize, setMedianFilterSize] = useState<number>(defaultMedianFilterSize);
  const imageIndex = medianFilterSize - MIN_MEDIAN_FILTER_RADIUS;

  useEffect(() => {
    zoomableImageCanvasRef.current?.setImageIndex(imageIndex);
  }, [zoomableImageCanvasRef, imageIndex]);

  return (
    <Spin spinning={isLoading} tip="Loading" size="large" delay={300}>
      <Row justify="center">
        <Col xs={24} md={12} lg={8}>
          <Form.Item
            label="Median blur radius"
            tooltip="Median blur filter finds the median value in the circle-shaped area around each pixel. Increasing radius increases blur."
            style={{margin: '0 16px'}}
          >
            <Slider
              value={medianFilterSize}
              onChange={(value: number) => setMedianFilterSize(value)}
              min={MIN_MEDIAN_FILTER_RADIUS}
              max={MAX_MEDIAN_FILTER_RADIUS}
              marks={medianFilterSizeSliderMarks}
            />
          </Form.Item>
        </Col>
      </Row>
      <div>
        <canvas ref={canvasRef} style={{width: '100%', height: `calc(100vh - 125px)`}} />
      </div>
    </Spin>
  );
};
