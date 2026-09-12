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

import {BgColorsOutlined} from '@ant-design/icons';
import {Trans, useLingui} from '@lingui/react/macro';
import {Button, Flex, Form, Grid, Radio, Select, Space, Typography} from 'antd';
import {type RadioChangeEvent} from 'antd/lib';
import {useEffect, useMemo, useState} from 'react';

import {EmptyImage} from '@/components/empty/EmptyImage';
import {ImageActions} from '@/components/image/ImageActions';
import {ImageViewSelector} from '@/components/image/ImageViewSelector';
import {LoadingIndicator} from '@/components/loading/LoadingIndicator';
import {useAccessTo} from '@/hooks/useAccessTo';
import {useErrorNotification} from '@/hooks/useErrorNotification';
import {useImageActions} from '@/hooks/useImageActions';
import {useOnnxModel} from '@/hooks/useOnnxModel';
import {useZoomableImageCanvas} from '@/hooks/useZoomableImageCanvas';
import {Access} from '@/services/auth/types';
import {ZoomableImageCanvas} from '@/services/canvas/image/zoomable-image-canvas';
import {NOOP_CANVAS_MODE_SUPPLIER} from '@/services/canvas/mode/canvas-mode';
import {PAINTING_PATCH_SIZES, type PaintingPatchSize} from '@/services/image/painting';
import {OnnxModelType} from '@/services/ml/types';
import {useAppStore} from '@/stores/app-store';

import styles from './ImagePainting.module.css';

const FILENAME_SUFFIX = 'loose-painting';

const STROKE_COUNT_OPTIONS = [
  {label: <Trans>Few</Trans>, value: PAINTING_PATCH_SIZES.small},
  {label: <Trans>Medium</Trans>, value: PAINTING_PATCH_SIZES.medium},
  {label: <Trans>Many</Trans>, value: PAINTING_PATCH_SIZES.large},
];

export function ImagePainting() {
  const selectedImageFile = useAppStore(state => state.selectedImageFile);
  const originalImage = useAppStore(state => state.originalImage);
  const paintingImage = useAppStore(state => state.paintingImage);
  const paintingPatchSize = useAppStore(state => state.paintingPatchSize);
  const isPaintingImageLoading = useAppStore(state => state.isPaintingImageLoading);
  const paintingDownloadTip = useAppStore(state => state.paintingDownloadTip);

  const setPaintingModel = useAppStore(state => state.setPaintingModel);
  const setPaintingPatchSize = useAppStore(state => state.setPaintingPatchSize);
  const loadPaintingImage = useAppStore(state => state.loadPaintingImage);
  const abortPainting = useAppStore(state => state.abortPainting);

  const screens = Grid.useBreakpoint();

  const {t} = useLingui();

  const {
    model,
    isLoading: isModelLoading,
    isError: isModelError,
  } = useOnnxModel(OnnxModelType.Painting, 'mamba-painter');

  const access = useAccessTo(model);

  useErrorNotification(
    isModelError || (!isModelLoading && !model),
    t`Unable to load the painting model`,
    t`Check your connection and try again.`
  );

  const [isShowingOriginal, setIsShowingOriginal] = useState(false);

  const images = useMemo(() => [paintingImage, originalImage], [paintingImage, originalImage]);

  const displayDimension = useMemo(
    () => (paintingImage ? ZoomableImageCanvas.imageDimension(paintingImage) : undefined),
    [paintingImage]
  );

  const {ref: canvasRef, zoomableImageCanvas} = useZoomableImageCanvas(
    NOOP_CANVAS_MODE_SUPPLIER,
    images,
    selectedImageFile?.digest,
    displayDimension
  );

  const {print, save, setAsReference} = useImageActions({
    canvas: zoomableImageCanvas,
    image: paintingImage,
    filenameSuffix: FILENAME_SUFFIX,
  });

  useEffect(() => {
    setPaintingModel(access === Access.Allowed ? model : null);
  }, [access, model, setPaintingModel]);

  useEffect(() => {
    zoomableImageCanvas?.setImageIndex(isShowingOriginal && paintingImage ? 1 : 0);
  }, [zoomableImageCanvas, isShowingOriginal, paintingImage]);

  if (!originalImage) {
    return <EmptyImage />;
  }

  return (
    <LoadingIndicator
      loading={isModelLoading || isPaintingImageLoading}
      tip={paintingDownloadTip}
      onCancel={isPaintingImageLoading && abortPainting}
    >
      <div className="u-tab-view">
        <Flex vertical className="u-tab-toolbar">
          <Space wrap className="u-flex">
            <Form.Item
              label={screens.sm ? <Trans>Strokes</Trans> : null}
              labelCol={{className: 'u-pb-0'}}
              tooltip={<Trans>Number of brush strokes in the painting</Trans>}
              className="u-mb-0"
            >
              {screens.sm ? (
                <Radio.Group
                  optionType="button"
                  buttonStyle="solid"
                  options={STROKE_COUNT_OPTIONS}
                  value={paintingPatchSize}
                  onChange={({target: {value}}: RadioChangeEvent) => {
                    setPaintingPatchSize(value as PaintingPatchSize);
                  }}
                  disabled={access !== Access.Allowed}
                />
              ) : (
                <Select<PaintingPatchSize>
                  aria-label={t`Strokes`}
                  options={STROKE_COUNT_OPTIONS}
                  value={paintingPatchSize}
                  onChange={(value: PaintingPatchSize) => {
                    setPaintingPatchSize(value);
                  }}
                  disabled={access !== Access.Allowed}
                  popupMatchSelectWidth={false}
                />
              )}
            </Form.Item>
            {!paintingImage && !isPaintingImageLoading && access === Access.Allowed && (
              <Button
                type="primary"
                icon={<BgColorsOutlined />}
                onClick={() => {
                  void loadPaintingImage();
                }}
              >
                <Trans>Paint</Trans>
              </Button>
            )}
            <ImageViewSelector
              isShowingOriginal={isShowingOriginal}
              resultLabel={<Trans>Painting</Trans>}
              onChange={setIsShowingOriginal}
              disabled={!paintingImage}
            />
            <ImageActions
              collapseBelow="md"
              disabled={!paintingImage || isShowingOriginal}
              onPrint={print}
              onSave={save}
              onSetAsReference={setAsReference}
            />
          </Space>
          {access === Access.Denied && (
            <Typography.Text type="warning">
              <Trans>Loose painting is available only to paid Patreon members</Trans>
            </Typography.Text>
          )}
        </Flex>
        <canvas ref={canvasRef} className={styles['previewCanvas']} />
      </div>
    </LoadingIndicator>
  );
}
