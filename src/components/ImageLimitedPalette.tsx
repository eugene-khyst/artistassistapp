/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {PictureOutlined} from '@ant-design/icons';
import {Button, Col, Flex, Form, Grid, Row, Spin, Typography} from 'antd';
import {useEffect, useState} from 'react';

import {useZoomableImageCanvas, zoomableImageCanvasSupplier} from '~/src/hooks';
import type {ZoomableImageCanvas} from '~/src/services/canvas/image';
import type {Color, ColorSet} from '~/src/services/color';
import {useAppStore} from '~/src/stores/app-store';

import {ColorCascader} from './color-set/ColorCascader';
import {EmptyColorSet} from './empty/EmptyColorSet';

const MAX_COLORS = 5;

export const ImageLimitedPalette: React.FC = () => {
  const colorSet = useAppStore(state => state.colorSet);
  const originalImage = useAppStore(state => state.originalImage);
  const limitedPaletteImage = useAppStore(state => state.limitedPaletteImage);

  const isOriginalImageLoading = useAppStore(state => state.isOriginalImageLoading);
  const isLimitedPaletteImageLoading = useAppStore(state => state.isLimitedPaletteImageLoading);

  const setLimitedColorSet = useAppStore(state => state.setLimitedColorSet);

  const screens = Grid.useBreakpoint();

  const [colors, setColors] = useState<(string | number | null)[][]>([]);

  const {ref: limitedPaletteCanvasRef} = useZoomableImageCanvas<ZoomableImageCanvas>(
    zoomableImageCanvasSupplier,
    limitedPaletteImage
  );

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

  const handlePreviewClick = () => {
    if (colorSet) {
      const limitedColorSet: ColorSet = {
        id: 0,
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

  if (!colorSet || !originalImage) {
    return (
      <div style={{padding: '0 16px 16px'}}>
        <EmptyColorSet feature="limited palette" tab="Limited palette" imageMandatory={true} />
      </div>
    );
  }

  const height = `calc((100vh - 130px) / ${screens['sm'] ? 1 : 2})`;

  return (
    <Spin spinning={isLoading} tip="Loading" size="large">
      <div style={{padding: '0 16px'}}>
        <Flex gap="small" align="baseline" style={{width: '100%', justifyContent: 'center'}}>
          <Form.Item
            label="Primary colors"
            tooltip="Using a limited palette helps achieve color harmony. Select up to 5 colors to be your primaries."
            style={{marginBottom: 0, flexGrow: 1}}
            {...(screens['sm']
              ? {
                  extra: (
                    <Typography.Text type={colors.length > MAX_COLORS ? 'danger' : 'secondary'}>
                      Select from 1 to 5 colors
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
          <Button
            icon={<PictureOutlined />}
            type="primary"
            onClick={handlePreviewClick}
            disabled={colors.length == 0 || colors.length > MAX_COLORS}
          >
            Preview
          </Button>
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
