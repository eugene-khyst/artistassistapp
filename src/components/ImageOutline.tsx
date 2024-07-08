/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {PrinterOutlined} from '@ant-design/icons';
import {Button, Spin} from 'antd';

import {useZoomableImageCanvas, zoomableImageCanvasSupplier} from '~/src/hooks';
import {usePrintImages} from '~/src/hooks';
import type {ZoomableImageCanvas} from '~/src/services/canvas/image';
import {useAppStore} from '~/src/stores/app-store';

import {EmptyImage} from './empty/EmptyImage';

export const ImageOutline: React.FC = () => {
  const originalImage = useAppStore(state => state.originalImage);
  const outlineImage = useAppStore(state => state.outlineImage);

  const isOutlineImageLoading = useAppStore(state => state.isOutlineImageLoading);

  const {ref: canvasRef} = useZoomableImageCanvas<ZoomableImageCanvas>(
    zoomableImageCanvasSupplier,
    outlineImage
  );

  const {ref: printRef, printImagesUrls, handlePrint} = usePrintImages(outlineImage);

  if (!originalImage) {
    return (
      <div style={{padding: '0 16px 16px'}}>
        <EmptyImage feature="view an outline from a reference photo" tab="Outline" />
      </div>
    );
  }

  return (
    <Spin spinning={isOutlineImageLoading} tip="Loading" size="large">
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
