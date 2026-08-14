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

import {
  DownloadOutlined,
  DownOutlined,
  InfoCircleOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import {Trans, useLingui} from '@lingui/react/macro';
import {Button, Dropdown, Grid, Popover, Space, Typography} from 'antd';
import {saveAs} from 'file-saver';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {ImageViewSelector} from '@/components/image/ImageViewSelector';
import {LoadingIndicator} from '@/components/loading/LoadingIndicator';
import {useZoomableImageCanvas} from '@/hooks/useZoomableImageCanvas';
import {
  type ClickOrTapEvent,
  ZoomableImageCanvas,
  ZoomableImageEventType,
} from '@/services/canvas/image/zoomable-image-canvas';
import {blobToImageFile} from '@/services/image/image-file';
import {useAppStore} from '@/stores/app-store';
import {getFilename} from '@/utils/filename';
import {imageBitmapToBlob} from '@/utils/graphics';

import {EmptyImage} from './empty/EmptyImage';
import styles from './ImageBlurred.module.css';

const FILENAME_SUFFIX = 'simplified';

export function ImageBlurred() {
  const selectedImageFile = useAppStore(state => state.selectedImageFile);
  const originalImage = useAppStore(state => state.originalImage);
  const blurFocalPoint = useAppStore(state => state.blurFocalPoint);
  const blurredMaskedImage = useAppStore(state => state.blurredMaskedImage);

  const isBlurredImagesLoading = useAppStore(state => state.isBlurredImagesLoading);

  const setBlurFocalPoint = useAppStore(state => state.setBlurFocalPoint);
  const saveRecentImageFile = useAppStore(state => state.saveRecentImageFile);

  const screens = Grid.useBreakpoint();
  const {t} = useLingui();

  const [isShowingOriginal, setIsShowingOriginal] = useState<boolean>(false);
  const isShowingOriginalRef = useRef<boolean>(false);

  const zoomableImageCanvasSupplier = useCallback(
    (canvas: HTMLCanvasElement): ZoomableImageCanvas => {
      const zoomableImageCanvas = new ZoomableImageCanvas(canvas);
      const listener = ({point}: ClickOrTapEvent) => {
        if (!isShowingOriginalRef.current) {
          void setBlurFocalPoint(point);
        }
      };
      zoomableImageCanvas.events.subscribe(ZoomableImageEventType.ClickOrTap, listener);
      return zoomableImageCanvas;
    },
    [setBlurFocalPoint]
  );

  const images = useMemo(
    () => [blurredMaskedImage, originalImage],
    [blurredMaskedImage, originalImage]
  );
  const displayDimension = useMemo(
    () => (blurredMaskedImage ? ZoomableImageCanvas.imageDimension(blurredMaskedImage) : undefined),
    [blurredMaskedImage]
  );

  const {ref: canvasRef, zoomableImageCanvas} = useZoomableImageCanvas<ZoomableImageCanvas>(
    zoomableImageCanvasSupplier,
    images,
    selectedImageFile?.digest,
    displayDimension
  );

  useEffect(() => {
    zoomableImageCanvas?.setImageIndex(isShowingOriginal && blurredMaskedImage ? 1 : 0);
    zoomableImageCanvas?.setCursor(isShowingOriginal ? 'grab' : 'crosshair');
  }, [zoomableImageCanvas, isShowingOriginal, blurredMaskedImage]);

  const handleViewChange = (isOriginal: boolean) => {
    isShowingOriginalRef.current = isOriginal;
    setIsShowingOriginal(isOriginal);
  };

  const handleSaveClick = async () => {
    if (!blurredMaskedImage) {
      return;
    }
    saveAs(
      await imageBitmapToBlob(blurredMaskedImage),
      getFilename(selectedImageFile, FILENAME_SUFFIX)
    );
  };

  const handleSetAsReferenceClick = async () => {
    if (!blurredMaskedImage) {
      return;
    }
    const blob: Blob = await imageBitmapToBlob(blurredMaskedImage);
    void saveRecentImageFile(
      await blobToImageFile(blob, getFilename(selectedImageFile, FILENAME_SUFFIX))
    );
  };

  if (!originalImage) {
    return <EmptyImage />;
  }

  const mobileFocalPointInstruction = t`Tap 👆 anywhere in the photo to choose a focal point.`;

  return (
    <LoadingIndicator loading={isBlurredImagesLoading}>
      <Space className="u-tab-toolbar">
        <ImageViewSelector
          isShowingOriginal={isShowingOriginal}
          resultLabel={<Trans>Simplified</Trans>}
          onChange={handleViewChange}
          disabled={!blurredMaskedImage}
        />

        <Space.Compact>
          <Button
            icon={<DownloadOutlined />}
            onClick={() => {
              void handleSaveClick();
            }}
            disabled={isShowingOriginal}
          >
            <Trans>Save</Trans>
          </Button>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'set-as-reference',
                  label: <Trans>Set as reference</Trans>,
                  icon: <PictureOutlined />,
                  onClick: () => {
                    void handleSetAsReferenceClick();
                  },
                  disabled: isShowingOriginal,
                },
              ],
            }}
            trigger={['click']}
          >
            <Button icon={<DownOutlined />} />
          </Dropdown>
        </Space.Compact>

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
        {!screens.md && !isShowingOriginal && !blurFocalPoint && (
          <Typography.Text className={styles['focalPointHint']}>
            {mobileFocalPointInstruction}
          </Typography.Text>
        )}
        <canvas ref={canvasRef} className={styles['previewCanvas']} />
      </div>
    </LoadingIndicator>
  );
}
