/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {DownloadOutlined, MoreOutlined} from '@ant-design/icons';
import type {MenuProps} from 'antd';
import {Button, Col, Dropdown, Flex, Form, Grid, Row, Space, Spin, Typography} from 'antd';
import {useEffect, useState} from 'react';

import {useZoomableImageCanvas, zoomableImageCanvasSupplier} from '~/src/hooks';
import type {ZoomableImageCanvas} from '~/src/services/canvas/image';
import type {Color, ColorSet} from '~/src/services/color';
import {useAppStore} from '~/src/stores/app-store';

import {ColorCascader} from './color-set/ColorCascader';
import {EmptyColorSet} from './empty/EmptyColorSet';

const MAX_COLORS = 7;

export const ImageLimitedPalette: React.FC = () => {
  const colorSet = useAppStore(state => state.colorSet);
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

  useEffect(() => {
    setColors([]);
  }, [colorSet]);

  const isLoading: boolean = isOriginalImageLoading || isLimitedPaletteImageLoading;

  const handleColorsChange = (value: (string | number | null)[] | (string | number | null)[][]) => {
    const colors = value as (string | number)[][];
    setColors(colors);
  };

  const handleApplyClick = () => {
    if (colorSet) {
      const limitedColorSet: ColorSet = {
        type: colorSet?.type,
        brands: colorSet?.brands,
        colors: colors
          .map(([brandId, colorId]): Color | undefined =>
            colorSet?.colors.find(({brand, id}: Color) => brandId === brand && colorId === id)
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
      onClick: () => void limitedPaletteCanvas?.saveAsImage('ArtistAssistApp-Limited-Palette'),
    },
  ];

  if (!colorSet || !originalImage) {
    return <EmptyColorSet feature="limited palette" imageMandatory={true} />;
  }

  const height = `calc((100vh - 130px) / ${screens['sm'] ? 1 : 2})`;

  return (
    <Spin spinning={isLoading} tip="Loading" size="large">
      <div style={{padding: '0 16px'}}>
        <Flex gap="small" align="baseline" style={{width: '100%', justifyContent: 'center'}}>
          <Form.Item
            label="Colors"
            tooltip={`Using a limited palette helps achieve color harmony. Select up to ${MAX_COLORS} colors to be your primaries.`}
            style={{marginBottom: 0, flexGrow: 1}}
            {...(screens['sm']
              ? {
                  extra: (
                    <Typography.Text type={colors.length > MAX_COLORS ? 'danger' : 'secondary'}>
                      Select from 1 to {MAX_COLORS} colors
                    </Typography.Text>
                  ),
                }
              : null)}
            {...(colors.length > MAX_COLORS ? {validateStatus: 'error'} : null)}
          >
            <ColorCascader
              value={colors}
              onChange={handleColorsChange}
              multiple
              maxTagCount="responsive"
            />
          </Form.Item>
          <Space.Compact>
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
        </Flex>
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
