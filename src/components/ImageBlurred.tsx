/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import type {CheckboxOptionType, RadioChangeEvent} from 'antd';
import {Form, Radio, Spin} from 'antd';
import {useEffect, useState} from 'react';

import {useZoomableImageCanvas, zoomableImageCanvasSupplier} from '~/src/hooks';
import type {ZoomableImageCanvas} from '~/src/services/canvas/image';
import {useAppStore} from '~/src/stores/app-store';

import {EmptyImage} from './empty/EmptyImage';

const MEDIAN_FILTER_RADIUS_OPTIONS: CheckboxOptionType<number>[] = [
  {value: 0, label: 'None'},
  {value: 1, label: 'Small'},
  {value: 2, label: 'Medium'},
  {value: 3, label: 'Large'},
];

const DEFAULT_BLURRED_IMAGE_INDEX = 1;

export const ImageBlurred: React.FC = () => {
  const originalImage = useAppStore(state => state.originalImage);
  const blurredImages = useAppStore(state => state.blurredImages);

  const isBlurredImagesLoading = useAppStore(state => state.isBlurredImagesLoading);

  const {ref: canvasRef, zoomableImageCanvas} = useZoomableImageCanvas<ZoomableImageCanvas>(
    zoomableImageCanvasSupplier,
    blurredImages
  );

  const [blurredImageIndex, setBlurredImageIndex] = useState<number>(DEFAULT_BLURRED_IMAGE_INDEX);

  useEffect(() => {
    zoomableImageCanvas?.setImageIndex(blurredImageIndex);
  }, [zoomableImageCanvas, blurredImageIndex]);

  const handleBlurChange = (e: RadioChangeEvent) => {
    setBlurredImageIndex(e.target.value as number);
  };

  if (!originalImage) {
    return (
      <div style={{padding: '0 16px 16px'}}>
        <EmptyImage feature="view a smoothed reference photo" tab="Simplified" />
      </div>
    );
  }

  return (
    <Spin spinning={isBlurredImagesLoading} tip="Loading" size="large">
      <div style={{display: 'flex', width: '100%', justifyContent: 'center', marginBottom: 8}}>
        <Form.Item
          label="Blur"
          tooltip="Controls the radius of the median filter."
          style={{marginBottom: 0}}
        >
          <Radio.Group
            options={MEDIAN_FILTER_RADIUS_OPTIONS}
            value={blurredImageIndex}
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
