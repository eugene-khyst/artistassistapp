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
import type {CheckboxOptionType, RadioChangeEvent} from 'antd';
import {Button, Col, Dropdown, Flex, Grid, Radio, Row, Space} from 'antd';
import {saveAs} from 'file-saver';
import {useEffect, useState} from 'react';

import {ColorSquare} from '@/components/color/ColorSquare';
import {GradientRect} from '@/components/color/GradientRect';
import {LoadingIndicator} from '@/components/loading/LoadingIndicator';
import {useZoomableImageCanvas, zoomableImageCanvasSupplier} from '@/hooks/useZoomableImageCanvas';
import type {ZoomableImageCanvas} from '@/services/canvas/image/zoomable-image-canvas';
import {COLOR_MAP_STOP_HEXES} from '@/services/image/filter/color-map-webgl';
import {TONAL_VALUE_HEXES} from '@/services/image/tonal-values';
import {printImages} from '@/services/print/print';
import {useAppStore} from '@/stores/app-store';
import {getFilename} from '@/utils/filename';
import {imageBitmapToBlob} from '@/utils/graphics';

import {EmptyImage} from './empty/EmptyImage';
import styles from './ImageTonalValues.module.css';

export function ImageTonalValues() {
  const imageFile = useAppStore(state => state.imageFile);
  const originalImage = useAppStore(state => state.originalImage);
  const tonalImages = useAppStore(state => state.tonalImages);

  const isOriginalImageLoading = useAppStore(state => state.isOriginalImageLoading);
  const isTonalImagesLoading = useAppStore(state => state.isTonalImagesLoading);

  const screens = Grid.useBreakpoint();

  const {t} = useLingui();

  const {ref: tonalValuesCanvasRef, zoomableImageCanvas: tonalValuesCanvas} =
    useZoomableImageCanvas<ZoomableImageCanvas>(zoomableImageCanvasSupplier, tonalImages);

  const {ref: originalCanvasRef} = useZoomableImageCanvas<ZoomableImageCanvas>(
    zoomableImageCanvasSupplier,
    originalImage
  );

  const [tonalImageIndex, setTonalImageIndex] = useState<number>(2);

  useEffect(() => {
    tonalValuesCanvas?.setImageIndex(tonalImageIndex);
  }, [tonalValuesCanvas, tonalImageIndex]);

  const isLoading: boolean = isOriginalImageLoading || isTonalImagesLoading;

  const handleTonalValueChange = (e: RadioChangeEvent) => {
    setTonalImageIndex(e.target.value as number);
  };

  const handlePrintClick = () => {
    void printImages(tonalImages);
  };

  const handleSaveClick = async () => {
    const image: ImageBitmap | undefined = tonalImages[tonalImageIndex];
    if (!image) {
      return;
    }
    saveAs(await imageBitmapToBlob(image), getFilename(imageFile, 'tonal-values'));
  };

  if (!originalImage) {
    return <EmptyImage />;
  }

  const toneOptions: CheckboxOptionType[] = [
    {
      value: 0,
      label: (
        <Flex align="center" gap="small">
          <ColorSquare size="small" hex={TONAL_VALUE_HEXES[0]!} />
          {screens.sm && <Trans>Light tone</Trans>}
        </Flex>
      ),
      title: screens.sm ? undefined : t`Light tone`,
    },
    {
      value: 1,
      label: (
        <Flex align="center" gap="small">
          <ColorSquare size="small" hex={TONAL_VALUE_HEXES[1]!} />
          {screens.sm && <Trans>Mid tone</Trans>}
        </Flex>
      ),
      title: screens.sm ? undefined : t`Mid tone`,
    },
    {
      value: 2,
      label: (
        <Flex align="center" gap="small">
          <ColorSquare size="small" hex={TONAL_VALUE_HEXES[2]!} />
          {screens.sm && <Trans>Shadow</Trans>}
        </Flex>
      ),
      title: screens.sm ? undefined : t`Shadow`,
    },
    {
      value: 3,
      label: (
        <Flex align="center" gap="small">
          <GradientRect hexes={COLOR_MAP_STOP_HEXES} />
          {screens.sm && <Trans>Color map</Trans>}
        </Flex>
      ),
      title: screens.sm ? undefined : t`Color map`,
    },
  ];

  return (
    <LoadingIndicator loading={isLoading}>
      <Space align="center" className="u-tab-toolbar">
        <Radio.Group
          options={toneOptions}
          value={tonalImageIndex}
          onChange={handleTonalValueChange}
          optionType="button"
          buttonStyle="solid"
          className={screens.sm ? undefined : styles['toneRadioGroupCompact']}
        />
        {screens.sm ? (
          <>
            <Button icon={<PrinterOutlined />} onClick={handlePrintClick}>
              <Trans>Print</Trans>
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={() => {
                void handleSaveClick();
              }}
            >
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
                  onClick: () => {
                    void handleSaveClick();
                  },
                },
              ],
            }}
          >
            <Button icon={<MoreOutlined />} />
          </Dropdown>
        )}
      </Space>
      <Row>
        <Col xs={24} sm={12}>
          <canvas ref={tonalValuesCanvasRef} className={styles['previewCanvas']} />
        </Col>
        <Col xs={24} sm={12}>
          <canvas ref={originalCanvasRef} className={styles['previewCanvas']} />
        </Col>
      </Row>
    </LoadingIndicator>
  );
}
