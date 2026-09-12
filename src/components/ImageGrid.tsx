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

import {Space} from 'antd';

import {GridControls} from '@/components/grid/GridControls';
import {ImageActions} from '@/components/image/ImageActions';
import {LoadingIndicator} from '@/components/loading/LoadingIndicator';
import {useImageActions} from '@/hooks/useImageActions';
import {useZoomableImageCanvas} from '@/hooks/useZoomableImageCanvas';
import {GridCanvasMode} from '@/services/canvas/mode/grid-canvas-mode';
import {useAppStore} from '@/stores/app-store';

import {EmptyImage} from './empty/EmptyImage';
import styles from './ImageGrid.module.css';

const gridDrawingModeSupplier = (): GridCanvasMode => {
  return new GridCanvasMode();
};

export function ImageGrid() {
  const selectedImageFile = useAppStore(state => state.selectedImageFile);
  const originalImage = useAppStore(state => state.originalImage);

  const isOriginalImageLoading = useAppStore(state => state.isOriginalImageLoading);

  const {
    ref: canvasRef,
    zoomableImageCanvas,
    canvasMode: gridDrawingMode,
  } = useZoomableImageCanvas(gridDrawingModeSupplier, originalImage, selectedImageFile?.digest);

  const {print, save} = useImageActions({canvas: zoomableImageCanvas, filenameSuffix: 'grid'});

  if (!originalImage) {
    return <EmptyImage />;
  }

  return (
    <LoadingIndicator loading={isOriginalImageLoading}>
      <div className="u-tab-view">
        <Space className="u-tab-toolbar">
          <GridControls gridDrawingMode={gridDrawingMode} />
          <ImageActions collapseBelow="sm" onPrint={print} onSave={save} />
        </Space>
        <canvas ref={canvasRef} className={styles['previewCanvas']} />
      </div>
    </LoadingIndicator>
  );
}
