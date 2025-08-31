/**
 * ArtistAssistApp
 * Copyright (C) 2023-2025  Eugene Khyst
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

import {DownloadOutlined, LoadingOutlined, MoreOutlined, PrinterOutlined} from '@ant-design/icons';
import {Trans, useLingui} from '@lingui/react/macro';
import type {MenuProps} from 'antd';
import {Button, Dropdown, Grid, Space, Spin} from 'antd';

import {GridControls} from '~/src/components/grid/GridControls';
import {useZoomableImageCanvas} from '~/src/hooks/useZoomableImageCanvas';
import {GridCanvas} from '~/src/services/canvas/image/grid-canvas';
import {printImages} from '~/src/services/print/print';
import {useAppStore} from '~/src/stores/app-store';
import {getFilename} from '~/src/utils/filename';

import {EmptyImage} from './empty/EmptyImage';

const gridCanvasSupplier = (canvas: HTMLCanvasElement): GridCanvas => {
  return new GridCanvas(canvas);
};

export const ImageGrid: React.FC = () => {
  const originalImageFile = useAppStore(state => state.originalImageFile);
  const originalImage = useAppStore(state => state.originalImage);

  const isOriginalImageLoading = useAppStore(state => state.isOriginalImageLoading);

  const screens = Grid.useBreakpoint();

  const {t} = useLingui();

  const {ref: canvasRef, zoomableImageCanvas: gridCanvas} = useZoomableImageCanvas<GridCanvas>(
    gridCanvasSupplier,
    originalImage
  );

  const handlePrintClick = () => {
    void printImages(gridCanvas?.convertToOffscreenCanvas());
  };

  const handleSaveClick = () => {
    void gridCanvas?.saveAsImage(getFilename(originalImageFile, 'grid'));
  };

  const items: MenuProps['items'] = [
    {
      key: '1',
      label: t`Print`,
      icon: <PrinterOutlined />,
      onClick: handlePrintClick,
    },
    {
      key: '2',
      label: t`Save`,
      icon: <DownloadOutlined />,
      onClick: handleSaveClick,
    },
  ];

  if (!originalImage) {
    return <EmptyImage />;
  }

  return (
    <Spin spinning={isOriginalImageLoading} indicator={<LoadingOutlined spin />} size="large">
      <Space align="start" style={{width: '100%', justifyContent: 'center', marginBottom: 8}}>
        <GridControls gridCanvas={gridCanvas} />
        {screens.sm ? (
          <>
            <Button icon={<PrinterOutlined />} onClick={handlePrintClick}>
              <Trans>Print</Trans>
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleSaveClick}>
              <Trans>Save</Trans>
            </Button>
          </>
        ) : (
          <Dropdown menu={{items}}>
            <Button icon={<MoreOutlined />} />
          </Dropdown>
        )}
      </Space>
      <div>
        <canvas ref={canvasRef} style={{width: '100%', height: `calc(100dvh - 115px)`}} />
      </div>
    </Spin>
  );
};
