/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {PrinterOutlined} from '@ant-design/icons';
import {Button, Spin} from 'antd';
import {Remote, wrap} from 'comlink';
import {useZoomableImageCanvas, zoomableImageCanvasSupplier} from '~/src/hooks';
import {useCreateImageBitmap} from '~/src/hooks/useCreateImageBitmap';
import {usePrintImages} from '~/src/hooks/usePrintImages';
import {ZoomableImageCanvas} from '~/src/services/canvas/image';
import {Outline} from '~/src/services/image';
import {EmptyImage} from './empty/EmptyImage';

const outline: Remote<Outline> = wrap(
  new Worker(new URL('../services/image/worker/outline-worker.ts', import.meta.url), {
    type: 'module',
  })
);

const ERODE_FILTER_RADIUS = 2;

const blobToImageBitmapsConverter = async (blob: Blob): Promise<ImageBitmap[]> => [
  (await outline.getOutline(blob, ERODE_FILTER_RADIUS)).outline,
];

type Props = {
  blob?: Blob;
};

export const ImageOutline: React.FC<Props> = ({blob}: Props) => {
  const {images, isLoading} = useCreateImageBitmap(blobToImageBitmapsConverter, blob);

  const {ref: canvasRef} = useZoomableImageCanvas<ZoomableImageCanvas>(
    zoomableImageCanvasSupplier,
    images
  );

  const {ref: printRef, printImagesUrls, handlePrint} = usePrintImages(images);

  if (!blob) {
    return (
      <div style={{padding: '0 16px 16px'}}>
        <EmptyImage feature="view an outline from a reference photo" tab="Outline" />
      </div>
    );
  }

  return (
    <Spin spinning={isLoading} tip="Loading" size="large">
      <div style={{display: 'flex', width: '100%', justifyContent: 'center', marginBottom: 8}}>
        <Button icon={<PrinterOutlined />} onClick={handlePrint}>
          Print
        </Button>
      </div>
      <div>
        <canvas ref={canvasRef} style={{width: '100%', height: `calc(100vh - 115px)`}} />
      </div>
      <div style={{display: 'none'}}>
        <div ref={printRef}>{printImagesUrls.length > 0 && <img src={printImagesUrls[0]} />}</div>
      </div>
    </Spin>
  );
};
