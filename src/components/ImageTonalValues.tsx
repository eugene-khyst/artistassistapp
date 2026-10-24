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

import {TonalValue} from '@eugene-khyst/artistassistapp-image-processing/color/tonal-value';
import {COLOR_MAP_STOP_HEXES} from '@eugene-khyst/artistassistapp-image-processing/filter/color-map-webgl';
import {
  TONAL_IMAGE_VALUES,
  TONAL_VALUE_HEXES,
} from '@eugene-khyst/artistassistapp-image-processing/tonal-values';
import {Trans, useLingui} from '@lingui/react/macro';
import {type CheckboxOptionType, Flex, Grid, Radio, type RadioChangeEvent, Space} from 'antd';
import {clsx} from 'clsx';
import {useEffect, useState} from 'react';

import {ColorSquare} from '@/components/color/ColorSquare';
import {GradientRect} from '@/components/color/GradientRect';
import {ImageActions} from '@/components/image/ImageActions';
import {LoadingIndicator} from '@/components/loading/LoadingIndicator';
import {TONAL_VALUE_LABELS} from '@/components/messages';
import {useConfirmDiscardImageEdits} from '@/hooks/useConfirmDiscardImageEdits';
import {useImageActions} from '@/hooks/useImageActions';
import {useZoomableImageCanvas} from '@/hooks/useZoomableImageCanvas';
import {NOOP_CANVAS_MODE_SUPPLIER} from '@/services/canvas/mode/canvas-mode';
import {imageFileToFile} from '@/services/image/image-file';
import {printImages} from '@/services/print/print';
import {useAppStore} from '@/stores/app-store';
import {TabKey} from '@/tabs';

import {EmptyImage} from './empty/EmptyImage';
import styles from './ImageTonalValues.module.css';

export function ImageTonalValues() {
  const selectedImageFile = useAppStore(state => state.selectedImageFile);
  const originalImage = useAppStore(state => state.originalImage);
  const tonalImages = useAppStore(state => state.tonalImages);

  const isOriginalImageLoading = useAppStore(state => state.isOriginalImageLoading);
  const isTonalImagesLoading = useAppStore(state => state.isTonalImagesLoading);
  const setActiveTabKey = useAppStore(state => state.setActiveTabKey);
  const editImageWithAutoWhiteBalance = useAppStore(state => state.editImageWithAutoWhiteBalance);

  const confirmDiscardImageEdits = useConfirmDiscardImageEdits();

  const screens = Grid.useBreakpoint();

  const {t} = useLingui();

  const {ref: tonalValuesCanvasRef, zoomableImageCanvas: tonalValuesCanvas} =
    useZoomableImageCanvas(NOOP_CANVAS_MODE_SUPPLIER, tonalImages, selectedImageFile?.digest);

  const {ref: originalCanvasRef} = useZoomableImageCanvas(
    NOOP_CANVAS_MODE_SUPPLIER,
    originalImage,
    selectedImageFile?.digest
  );

  const [tonalImageIndex, setTonalImageIndex] = useState<number>(() =>
    TONAL_IMAGE_VALUES.indexOf(TonalValue.Shadows)
  );

  useEffect(() => {
    tonalValuesCanvas?.setImageIndex(tonalImageIndex);
  }, [tonalValuesCanvas, tonalImageIndex]);

  const isLoading: boolean = isOriginalImageLoading || isTonalImagesLoading;

  const handleTonalValueChange = (e: RadioChangeEvent) => {
    setTonalImageIndex(e.target.value as number);
  };

  const {save} = useImageActions({
    image: tonalImages[tonalImageIndex],
    filenameSuffix: 'tonal-values',
  });

  const handlePrintClick = () => {
    void printImages(tonalImages);
  };

  const handleWhiteBalanceClick = async () => {
    if (
      !selectedImageFile ||
      !(await confirmDiscardImageEdits()) ||
      !(await setActiveTabKey(TabKey.EditImage))
    ) {
      return;
    }
    await editImageWithAutoWhiteBalance(imageFileToFile(selectedImageFile));
  };

  if (!originalImage) {
    return <EmptyImage />;
  }

  const collapseBelow = 'md';

  const toneOptions: CheckboxOptionType[] = [
    ...TONAL_IMAGE_VALUES.map((tonalValue, index) => ({
      value: index,
      label: (
        <Flex align="center" gap="small">
          <ColorSquare size="small" hex={TONAL_VALUE_HEXES[tonalValue]} />
          {screens[collapseBelow] && t(TONAL_VALUE_LABELS[tonalValue])}
        </Flex>
      ),
      title: screens[collapseBelow] ? undefined : t(TONAL_VALUE_LABELS[tonalValue]),
    })),
    {
      value: TONAL_IMAGE_VALUES.length,
      label: (
        <Flex align="center" gap="small">
          <GradientRect hexes={COLOR_MAP_STOP_HEXES} />
          {screens[collapseBelow] && <Trans>Color map</Trans>}
        </Flex>
      ),
      title: screens[collapseBelow] ? undefined : t`Color map`,
    },
  ];

  return (
    <LoadingIndicator loading={isLoading}>
      <div className="u-tab-view">
        <Space align="center" className="u-tab-toolbar">
          <Radio.Group
            aria-label={t`Tonal values`}
            options={toneOptions}
            value={tonalImageIndex}
            onChange={handleTonalValueChange}
            optionType="button"
            buttonStyle="solid"
            className={
              screens[collapseBelow] ? undefined : clsx('u-flex', styles['toneRadioGroupCompact'])
            }
          />
          <ImageActions
            collapseBelow="sm"
            onPrint={handlePrintClick}
            onSave={save}
            extraActions={[
              {
                key: 'white-balance',
                label: <Trans>White balance</Trans>,
                onClick: () => {
                  void handleWhiteBalanceClick();
                },
              },
            ]}
          />
        </Space>
        <div className={styles['previews']}>
          <canvas ref={tonalValuesCanvasRef} className={styles['previewCanvas']} />
          <canvas ref={originalCanvasRef} className={styles['previewCanvas']} />
        </div>
      </div>
    </LoadingIndicator>
  );
}
