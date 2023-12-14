/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {PrinterOutlined} from '@ant-design/icons';
import {Button, CheckboxOptionType, Radio, RadioChangeEvent, Space, Spin} from 'antd';
import {Remote, wrap} from 'comlink';
import {useEffect, useRef, useState} from 'react';
import {useReactToPrint} from 'react-to-print';
import {useZoomableImageCanvas} from '../hooks/';
import {useCreateImageBitmap} from '../hooks/useCreateImageBitmap';
import {ZoomableImageCanvas} from '../services/canvas/image';
import {TonalValues} from '../services/image';
import {imageBitmapToOffscreenCanvas} from '../utils';

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

const blobToImageBitmapsConverter = async (blob: Blob): Promise<ImageBitmap[]> => {
  return (await tonalValues.getTones(blob, THRESHOLDS, MEDIAN_FILTER_RADIUS)).tones;
};

const zoomableImageCanvasSupplier = (canvas: HTMLCanvasElement): ZoomableImageCanvas => {
  return new ZoomableImageCanvas(canvas);
};

type Props = {
  blob?: Blob;
};

export const ImageTonalValues: React.FC<Props> = ({blob}: Props) => {
  const {images, isLoading} = useCreateImageBitmap(blobToImageBitmapsConverter, blob);

  const {ref: canvasRef, zoomableImageCanvasRef} = useZoomableImageCanvas<ZoomableImageCanvas>(
    zoomableImageCanvasSupplier,
    images
  );
  const [imageIndex, setImageIndex] = useState<number>(0);

  const printRef = useRef<HTMLDivElement>(null);
  const promiseResolveRef = useRef<any>(null);
  const [printImagesUrls, setPrintImagesUrls] = useState<string[]>([]);

  useEffect(() => {
    if (printImagesUrls.length && promiseResolveRef.current) {
      promiseResolveRef.current();
    }
  }, [printImagesUrls]);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    onBeforeGetContent: async () => {
      const blobs = await Promise.all(
        images.map((image: ImageBitmap): Promise<Blob> => {
          const [canvas] = imageBitmapToOffscreenCanvas(image);
          return canvas.convertToBlob();
        })
      );
      return await new Promise<void>(resolve => {
        promiseResolveRef.current = resolve;
        const urls: string[] = blobs.map((blob: Blob): string => URL.createObjectURL(blob));
        setPrintImagesUrls(urls);
      });
    },
    onAfterPrint: () => {
      promiseResolveRef.current = null;
      printImagesUrls.forEach((url: string) => URL.revokeObjectURL(url));
      setPrintImagesUrls([]);
    },
  });

  useEffect(() => {
    zoomableImageCanvasRef.current?.setImageIndex(imageIndex);
  }, [zoomableImageCanvasRef, imageIndex]);

  return (
    <Spin spinning={isLoading} tip="Loading" size="large" delay={300}>
      <Space
        size="small"
        align="center"
        style={{width: '100%', justifyContent: 'center', marginBottom: 8}}
      >
        <Radio.Group
          options={TONES_OPTIONS}
          value={imageIndex}
          onChange={(e: RadioChangeEvent) => setImageIndex(e.target.value)}
          optionType="button"
          buttonStyle="solid"
        />
        <Button icon={<PrinterOutlined />} onClick={handlePrint}>
          Print
        </Button>
      </Space>
      <div>
        <canvas ref={canvasRef} style={{width: '100%', height: `calc(100vh - 115px)`}} />
      </div>
      <div style={{display: 'none'}}>
        <div ref={printRef}>
          {printImagesUrls.map((url: string, i: number) => (
            <img key={i} src={url} style={{pageBreakAfter: 'always'}} />
          ))}
        </div>
      </div>
    </Spin>
  );
};
