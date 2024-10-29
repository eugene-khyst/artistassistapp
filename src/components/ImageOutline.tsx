/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {DownloadOutlined, PrinterOutlined} from '@ant-design/icons';
import {Button, Space, Spin} from 'antd';

import {useZoomableImageCanvas, zoomableImageCanvasSupplier} from '~/src/hooks';
import {usePrintImages} from '~/src/hooks';
import type {ZoomableImageCanvas} from '~/src/services/canvas/image';
import {useAppStore} from '~/src/stores/app-store';

import {EmptyImage} from './empty/EmptyImage';

export const ImageOutline: React.FC = () => {
  const originalImage = useAppStore(state => state.originalImage);
  const outlineImage = useAppStore(state => state.outlineImage);

  const isOutlineImageLoading = useAppStore(state => state.isOutlineImageLoading);

  const {ref: canvasRef, zoomableImageCanvas} = useZoomableImageCanvas<ZoomableImageCanvas>(
    zoomableImageCanvasSupplier,
    outlineImage
  );

  const {ref: printRef, printImagesUrls, handlePrint} = usePrintImages(outlineImage);

  if (!originalImage) {
    return <EmptyImage feature="view an outline from a reference photo" />;
  }

  return (
    <Spin spinning={isOutlineImageLoading} tip="Loading" size="large">
      <div style={{display: 'flex', width: '100%', justifyContent: 'center', marginBottom: 8}}>
        <Space.Compact>
          <Button icon={<PrinterOutlined />} onClick={handlePrint}>
            Print
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={() => void zoomableImageCanvas?.saveAsImage('ArtistAssistApp-Outline')}
          >
            Save
          </Button>
        </Space.Compact>
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
