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

import {InfoCircleOutlined} from '@ant-design/icons';
import {Trans, useLingui} from '@lingui/react/macro';
import {Button, Grid, Popover, Space, Typography} from 'antd';
import {useEffect, useMemo, useRef, useState} from 'react';

import {ImageActions} from '@/components/image/ImageActions';
import {ImageViewSelector} from '@/components/image/ImageViewSelector';
import {LoadingIndicator} from '@/components/loading/LoadingIndicator';
import {useImageActions} from '@/hooks/useImageActions';
import {useZoomableImageCanvas} from '@/hooks/useZoomableImageCanvas';
import {
  type ClickOrTapEvent,
  ZoomableImageCanvas,
  ZoomableImageEventType,
} from '@/services/canvas/image/zoomable-image-canvas';
import {NOOP_CANVAS_MODE_SUPPLIER} from '@/services/canvas/mode/canvas-mode';
import {useAppStore} from '@/stores/app-store';

import {EmptyImage} from './empty/EmptyImage';
import styles from './ImageSimplifier.module.css';

const FILENAME_SUFFIX = 'simplified';

export function ImageSimplifier() {
  const selectedImageFile = useAppStore(state => state.selectedImageFile);
  const originalImage = useAppStore(state => state.originalImage);
  const simplifyFocalPoint = useAppStore(state => state.simplifyFocalPoint);
  const simplifiedMaskedImage = useAppStore(state => state.simplifiedMaskedImage);

  const isSimplifiedImagesLoading = useAppStore(state => state.isSimplifiedImagesLoading);

  const setSimplifyFocalPoint = useAppStore(state => state.setSimplifyFocalPoint);

  const screens = Grid.useBreakpoint();

  const {t} = useLingui();

  const [isShowingOriginal, setIsShowingOriginal] = useState<boolean>(false);
  const isShowingOriginalRef = useRef<boolean>(false);

  const images = useMemo(
    () => [simplifiedMaskedImage, originalImage],
    [simplifiedMaskedImage, originalImage]
  );
  const displayDimension = useMemo(
    () =>
      simplifiedMaskedImage ? ZoomableImageCanvas.imageDimension(simplifiedMaskedImage) : undefined,
    [simplifiedMaskedImage]
  );

  const {ref: canvasRef, zoomableImageCanvas} = useZoomableImageCanvas(
    NOOP_CANVAS_MODE_SUPPLIER,
    images,
    selectedImageFile?.digest,
    displayDimension
  );

  useEffect(() => {
    if (!zoomableImageCanvas) {
      return;
    }
    const listener = ({imagePoint}: ClickOrTapEvent) => {
      if (!isShowingOriginalRef.current) {
        void setSimplifyFocalPoint(imagePoint);
      }
    };
    zoomableImageCanvas.events.subscribe(ZoomableImageEventType.ClickOrTap, listener);
    return () => {
      zoomableImageCanvas.events.unsubscribe(ZoomableImageEventType.ClickOrTap, listener);
    };
  }, [setSimplifyFocalPoint, zoomableImageCanvas]);

  useEffect(() => {
    zoomableImageCanvas?.setImageIndex(isShowingOriginal && simplifiedMaskedImage ? 1 : 0);
    zoomableImageCanvas?.setCursor(isShowingOriginal ? 'grab' : 'crosshair');
  }, [zoomableImageCanvas, isShowingOriginal, simplifiedMaskedImage]);

  useEffect(() => {
    isShowingOriginalRef.current = isShowingOriginal;
  }, [isShowingOriginal]);

  const {print, save, setAsReference} = useImageActions({
    canvas: zoomableImageCanvas,
    image: simplifiedMaskedImage,
    filenameSuffix: FILENAME_SUFFIX,
  });

  if (!originalImage) {
    return <EmptyImage />;
  }

  const mobileFocalPointInstruction = t`Tap 👆 anywhere in the photo to choose a focal point.`;

  return (
    <LoadingIndicator loading={isSimplifiedImagesLoading}>
      <div className="u-tab-view">
        <Space className="u-tab-toolbar">
          <ImageViewSelector
            isShowingOriginal={isShowingOriginal}
            resultLabel={<Trans>Simplified</Trans>}
            onChange={setIsShowingOriginal}
            disabled={!simplifiedMaskedImage}
          />

          <ImageActions
            collapseBelow="md"
            disabled={!simplifiedMaskedImage || isShowingOriginal}
            onPrint={print}
            onSave={save}
            onSetAsReference={setAsReference}
          />

          {!isShowingOriginal &&
            (screens.md ? (
              <Typography.Text>
                <Trans>Click 🖱️ or tap 👆 anywhere in the photo to choose a focal point.</Trans>
              </Typography.Text>
            ) : (
              <Popover content={mobileFocalPointInstruction} trigger="click">
                <Button
                  type="text"
                  icon={<InfoCircleOutlined />}
                  aria-label={t`Focal point instructions`}
                />
              </Popover>
            ))}
        </Space>
        <div className={styles['canvasContainer']}>
          {!screens.md && !isShowingOriginal && !simplifyFocalPoint && (
            <Typography.Text className={styles['focalPointHint']}>
              {mobileFocalPointInstruction}
            </Typography.Text>
          )}
          <canvas ref={canvasRef} className={styles['previewCanvas']} />
        </div>
      </div>
    </LoadingIndicator>
  );
}
