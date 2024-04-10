/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {CheckboxOptionType, Form, Radio, RadioChangeEvent, Spin} from 'antd';
import {Remote, wrap} from 'comlink';
import {useEffect, useState} from 'react';
import {useZoomableImageCanvas, zoomableImageCanvasSupplier} from '~/src/hooks';
import {useCreateImageBitmap} from '~/src/hooks/useCreateImageBitmap';
import {ZoomableImageCanvas} from '~/src/services/canvas/image';
import {Blur} from '~/src/services/image';
import {EmptyImage} from './empty/EmptyImage';

const blur: Remote<Blur> = wrap(
  new Worker(new URL('../services/image/worker/blur-worker.ts', import.meta.url), {
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

const DEFAULT_BLURRED_IMAGE_INDEX = 1;

const blobToImageBitmapsConverter = async (blob: Blob): Promise<ImageBitmap[]> =>
  (await blur.getBlurred(blob, MEDIAN_FILTER_RADIUSES)).blurred;

type Props = {
  blob?: Blob;
};

export const ImageBlurred: React.FC<Props> = ({blob}: Props) => {
  const {images, isLoading} = useCreateImageBitmap(blobToImageBitmapsConverter, blob);

  const {ref: canvasRef, zoomableImageCanvas} = useZoomableImageCanvas<ZoomableImageCanvas>(
    zoomableImageCanvasSupplier,
    images
  );

  const [blurredImageIndex, setBlurredImageIndex] = useState<number>(DEFAULT_BLURRED_IMAGE_INDEX);

  useEffect(() => {
    zoomableImageCanvas?.setImageIndex(blurredImageIndex);
  }, [zoomableImageCanvas, blurredImageIndex]);

  const handleBlurChange = (e: RadioChangeEvent) => {
    setBlurredImageIndex(e.target.value);
  };

  if (!blob) {
    return (
      <div style={{padding: '0 16px 16px'}}>
        <EmptyImage feature="view a smoothed reference photo" tab="Simplified" />
      </div>
    );
  }

  return (
    <Spin spinning={isLoading} tip="Loading" size="large">
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
