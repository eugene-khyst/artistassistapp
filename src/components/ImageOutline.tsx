/**
 * ArtistAssistApp
 * Copyright (C) 2023-2024  Eugene Khyst
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import {DownloadOutlined, LoadingOutlined, PrinterOutlined} from '@ant-design/icons';
import {Button, Space, Spin} from 'antd';
import {useState} from 'react';

import {PrintImageDrawer} from '~/src/components/print/PrintImageDrawer';
import {useZoomableImageCanvas, zoomableImageCanvasSupplier} from '~/src/hooks';
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

  const [isOpenPrintImage, setIsOpenPrintImage] = useState<boolean>(false);

  if (!originalImage) {
    return <EmptyImage feature="view an outline from a reference photo" />;
  }

  return (
    <Spin
      spinning={isOutlineImageLoading}
      tip="Loading"
      indicator={<LoadingOutlined spin />}
      size="large"
    >
      <div style={{display: 'flex', width: '100%', justifyContent: 'center', marginBottom: 8}}>
        <Space>
          <Button
            icon={<PrinterOutlined />}
            onClick={() => {
              setIsOpenPrintImage(true);
            }}
          >
            Print
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={() => void zoomableImageCanvas?.saveAsImage('ArtistAssistApp-Outline')}
          >
            Save
          </Button>
        </Space>
      </div>
      <div>
        <canvas ref={canvasRef} style={{width: '100%', height: `calc(100vh - 115px)`}} />
      </div>
      <PrintImageDrawer
        image={outlineImage}
        open={isOpenPrintImage}
        onClose={() => {
          setIsOpenPrintImage(false);
        }}
      />
    </Spin>
  );
};
