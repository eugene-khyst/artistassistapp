/**
 * ArtistAssistApp
 * Copyright (C) 2023-2026  Eugene Khyst
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

import {DownloadOutlined, MoreOutlined, PrinterOutlined} from '@ant-design/icons';
import {Trans, useLingui} from '@lingui/react/macro';
import {Button, Dropdown, Grid, Space} from 'antd';

import {GridControls} from '@/components/grid/GridControls';
import {LoadingIndicator} from '@/components/loading/LoadingIndicator';
import {useZoomableImageCanvas} from '@/hooks/useZoomableImageCanvas';
import {GridCanvas} from '@/services/canvas/image/grid-canvas';
import {printImages} from '@/services/print/print';
import {useAppStore} from '@/stores/app-store';
import {getFilename} from '@/utils/filename';

import {EmptyImage} from './empty/EmptyImage';
import styles from './ImageGrid.module.css';

const gridCanvasSupplier = (canvas: HTMLCanvasElement): GridCanvas => {
  return new GridCanvas(canvas);
};

export function ImageGrid() {
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

  if (!originalImage) {
    return <EmptyImage />;
  }

  return (
    <LoadingIndicator loading={isOriginalImageLoading}>
      <Space className="u-tab-toolbar">
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
          <Dropdown
            trigger={['click']}
            menu={{
              items: [
                {
                  key: 'print',
                  label: t`Print`,
                  icon: <PrinterOutlined />,
                  onClick: handlePrintClick,
                },
                {
                  key: 'save',
                  label: t`Save`,
                  icon: <DownloadOutlined />,
                  onClick: handleSaveClick,
                },
              ],
            }}
          >
            <Button icon={<MoreOutlined />} />
          </Dropdown>
        )}
      </Space>
      <div>
        <canvas ref={canvasRef} className={styles['previewCanvas']} />
      </div>
    </LoadingIndicator>
  );
}
