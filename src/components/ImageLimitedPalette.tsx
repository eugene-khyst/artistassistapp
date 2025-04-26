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

import {DownloadOutlined, LoadingOutlined, MoreOutlined} from '@ant-design/icons';
import type {MenuProps} from 'antd';
import {Button, Col, Dropdown, Form, Grid, Row, Space, Spin, Typography} from 'antd';
import {useEffect, useState} from 'react';

import {
  useZoomableImageCanvas,
  zoomableImageCanvasSupplier,
} from '~/src/hooks/useZoomableImageCanvas';
import type {ZoomableImageCanvas} from '~/src/services/canvas/image/zoomable-image-canvas';
import type {Color, ColorSet} from '~/src/services/color/types';
import {useAppStore} from '~/src/stores/app-store';
import {getFilename} from '~/src/utils/filename';

import {ColorCascader} from './color-set/ColorCascader';
import {EmptyColorSet} from './empty/EmptyColorSet';

const MAX_COLORS = 7;

export const ImageLimitedPalette: React.FC = () => {
  const colorSet = useAppStore(state => state.colorSet);
  const originalImageFile = useAppStore(state => state.originalImageFile);
  const originalImage = useAppStore(state => state.originalImage);
  const limitedPaletteImage = useAppStore(state => state.limitedPaletteImage);

  const isOriginalImageLoading = useAppStore(state => state.isOriginalImageLoading);
  const isLimitedPaletteImageLoading = useAppStore(state => state.isLimitedPaletteImageLoading);

  const setLimitedColorSet = useAppStore(state => state.setLimitedColorSet);

  const screens = Grid.useBreakpoint();

  const [colors, setColors] = useState<(string | number | null)[][]>([]);

  const {ref: limitedPaletteCanvasRef, zoomableImageCanvas: limitedPaletteCanvas} =
    useZoomableImageCanvas<ZoomableImageCanvas>(zoomableImageCanvasSupplier, limitedPaletteImage);

  const {ref: originalCanvasRef} = useZoomableImageCanvas<ZoomableImageCanvas>(
    zoomableImageCanvasSupplier,
    originalImage
  );

  const isLoading: boolean = isOriginalImageLoading || isLimitedPaletteImageLoading;

  useEffect(() => {
    setColors([]);
  }, [colorSet]);

  const handleColorsChange = (value: (string | number | null)[] | (string | number | null)[][]) => {
    const colors = value as (string | number)[][];
    setColors(colors);
  };

  const handleApplyClick = () => {
    if (colorSet) {
      const limitedColorSet: ColorSet = {
        type: colorSet.type,
        brands: colorSet.brands,
        colors: colors
          .map(([brandId, colorId]): Color | undefined =>
            colorSet.colors.find(({brand, id}: Color) => brandId === brand && colorId === id)
          )
          .filter((color): color is Color => !!color),
      };
      void setLimitedColorSet(limitedColorSet);
    }
  };

  const items: MenuProps['items'] = [
    {
      key: '1',
      label: 'Save',
      icon: <DownloadOutlined />,
      onClick: () => {
        void limitedPaletteCanvas?.saveAsImage(getFilename(originalImageFile, 'limited-palette'));
      },
      disabled: !limitedPaletteImage,
    },
  ];

  if (!colorSet || !originalImage) {
    return <EmptyColorSet feature="limited palette" imageMandatory={true} />;
  }

  const height = `calc((100dvh - 130px) / ${screens.sm ? 1 : 2})`;

  return (
    <Spin spinning={isLoading} tip="Loading" indicator={<LoadingOutlined spin />} size="large">
      <div style={{padding: '0 16px'}}>
        <Space.Compact style={{display: 'flex'}}>
          <Form.Item
            label="Colors"
            tooltip={`Using a limited palette helps achieve color harmony. Select up to ${MAX_COLORS} colors to be your primaries.`}
            style={{flexGrow: 1, marginBottom: 0}}
            extra={
              <Typography.Text type={colors.length > MAX_COLORS ? 'danger' : 'secondary'}>
                Select from 1 to {MAX_COLORS} colors
              </Typography.Text>
            }
            validateStatus={colors.length > MAX_COLORS ? 'error' : undefined}
          >
            <ColorCascader
              value={colors}
              onChange={handleColorsChange}
              multiple
              maxTagCount="responsive"
            />
          </Form.Item>
          <Button
            type="primary"
            onClick={handleApplyClick}
            disabled={colors.length == 0 || colors.length > MAX_COLORS}
          >
            Apply
          </Button>
          <Dropdown menu={{items}}>
            <Button icon={<MoreOutlined />} />
          </Dropdown>
        </Space.Compact>
      </div>
      <Row>
        <Col xs={24} sm={12}>
          <canvas ref={limitedPaletteCanvasRef} style={{width: '100%', height}} />
        </Col>
        <Col xs={24} sm={12}>
          <canvas ref={originalCanvasRef} style={{width: '100%', height}} />
        </Col>
      </Row>
    </Spin>
  );
};
