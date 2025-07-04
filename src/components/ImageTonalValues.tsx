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
import type {CheckboxOptionType, MenuProps, RadioChangeEvent} from 'antd';
import {Button, Col, Dropdown, Grid, Radio, Row, Space, Spin} from 'antd';
import {saveAs} from 'file-saver';
import {useEffect, useState} from 'react';

import {
  useZoomableImageCanvas,
  zoomableImageCanvasSupplier,
} from '~/src/hooks/useZoomableImageCanvas';
import type {ZoomableImageCanvas} from '~/src/services/canvas/image/zoomable-image-canvas';
import {printImages} from '~/src/services/print/print';
import {useAppStore} from '~/src/stores/app-store';
import {getFilename} from '~/src/utils/filename';
import {imageBitmapToBlob} from '~/src/utils/graphics';

import {EmptyImage} from './empty/EmptyImage';

export const ImageTonalValues: React.FC = () => {
  const originalImageFile = useAppStore(state => state.originalImageFile);
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
    saveAs(await imageBitmapToBlob(image), getFilename(originalImageFile, 'tonal-values'));
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
      onClick: () => {
        void handleSaveClick();
      },
    },
  ];

  if (!originalImage) {
    return <EmptyImage />;
  }

  const toneOptions: CheckboxOptionType[] = [
    {value: 0, label: t`Light tone`},
    {value: 1, label: t`Mid tone`},
    {value: 2, label: t`Shadow`},
  ];

  const height = `calc((100dvh - 115px) / ${screens.sm ? 1 : 2})`;

  return (
    <Spin spinning={isLoading} indicator={<LoadingOutlined spin />} size="large">
      <Space align="center" style={{width: '100%', justifyContent: 'center', marginBottom: 8}}>
        <Radio.Group
          options={toneOptions}
          value={tonalImageIndex}
          onChange={handleTonalValueChange}
          optionType="button"
          buttonStyle="solid"
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
          <Dropdown menu={{items}}>
            <Button icon={<MoreOutlined />} />
          </Dropdown>
        )}
      </Space>
      <Row>
        <Col xs={24} sm={12}>
          <canvas ref={tonalValuesCanvasRef} style={{width: '100%', height}} />
        </Col>
        <Col xs={24} sm={12}>
          <canvas ref={originalCanvasRef} style={{width: '100%', height}} />
        </Col>
      </Row>
    </Spin>
  );
};
