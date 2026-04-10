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

import {DownloadOutlined, DownOutlined, SwapOutlined} from '@ant-design/icons';
import {Trans, useLingui} from '@lingui/react/macro';
import {Button, Col, Dropdown, Form, Grid, Row, Space, Typography} from 'antd';
import {saveAs} from 'file-saver';
import {useEffect, useState} from 'react';

import {LoadingIndicator} from '~/src/components/loading/LoadingIndicator';
import {
  useZoomableImageCanvas,
  zoomableImageCanvasSupplier,
} from '~/src/hooks/useZoomableImageCanvas';
import type {ZoomableImageCanvas} from '~/src/services/canvas/image/zoomable-image-canvas';
import {isMixable, MIXABLE_COLOR_TYPES} from '~/src/services/color/color-mixer';
import type {ColorId} from '~/src/services/color/types';
import {useAppStore} from '~/src/stores/app-store';
import {getFilename} from '~/src/utils/filename';
import {imageBitmapToBlob} from '~/src/utils/graphics';

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
  const setLimitedColorSetAsMain = useAppStore(state => state.setLimitedColorSetAsMain);
  const abortLimitedPalette = useAppStore(state => state.abortLimitedPalette);

  const screens = Grid.useBreakpoint();

  const {t} = useLingui();

  const [colorIds, setColorIds] = useState<ColorId[]>([]);

  const {ref: limitedPaletteCanvasRef} = useZoomableImageCanvas<ZoomableImageCanvas>(
    zoomableImageCanvasSupplier,
    limitedPaletteImage
  );

  const {ref: originalCanvasRef} = useZoomableImageCanvas<ZoomableImageCanvas>(
    zoomableImageCanvasSupplier,
    originalImage
  );

  const isLoading: boolean = isOriginalImageLoading || isLimitedPaletteImageLoading;

  useEffect(() => {
    setColorIds([]);
  }, [colorSet]);

  const handleApplyClick = () => {
    void setLimitedColorSet(colorIds);
  };

  const handleSetAsMainClick = () => {
    setLimitedColorSetAsMain(colorIds);
  };

  const handleSaveClick = async () => {
    if (!limitedPaletteImage) {
      return;
    }
    saveAs(
      await imageBitmapToBlob(limitedPaletteImage),
      getFilename(originalImageFile, 'limited-palette')
    );
  };

  if (!colorSet || !originalImage || !isMixable(colorSet.type)) {
    return <EmptyColorSet supportedColorTypes={MIXABLE_COLOR_TYPES} imageMandatory />;
  }

  const height = `calc((100dvh - 130px) / ${screens.sm ? 1 : 2})`;

  return (
    <LoadingIndicator loading={isLoading} onCancel={abortLimitedPalette}>
      <div>
        <Form.Item
          label={t`Colors`}
          tooltip={t`Using a limited palette helps achieve color harmony. Select up to ${MAX_COLORS} colors to be your primaries.`}
          style={{
            marginBottom: 0,
            padding: '0 16px',
          }}
          extra={
            <Typography.Text type={colorIds.length > MAX_COLORS ? 'danger' : 'secondary'}>
              <Trans>Select from 1 to {MAX_COLORS} colors</Trans>
            </Typography.Text>
          }
          validateStatus={colorIds.length > MAX_COLORS ? 'error' : undefined}
        >
          <Space.Compact style={{display: 'flex'}}>
            <ColorCascader
              value={colorIds}
              onChange={value => {
                setColorIds(value);
              }}
              multiple
              maxTagCount="responsive"
              style={{flexGrow: 1}}
            />
            <Button
              type="primary"
              onClick={handleApplyClick}
              disabled={!colorIds.length || colorIds.length > MAX_COLORS}
            >
              <Trans>Apply</Trans>
            </Button>
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'save',
                    label: t`Save`,
                    icon: <DownloadOutlined />,
                    onClick: () => {
                      void handleSaveClick();
                    },
                    disabled: !limitedPaletteImage,
                  },
                  {
                    key: 'set-as-main-color-set',
                    label: t`Set as main color set`,
                    icon: <SwapOutlined />,
                    onClick: handleSetAsMainClick,
                    disabled: !colorIds.length,
                  },
                ],
              }}
            >
              <Button icon={<DownOutlined />} />
            </Dropdown>
          </Space.Compact>
        </Form.Item>
      </div>
      <Row>
        <Col xs={24} sm={12}>
          <canvas ref={limitedPaletteCanvasRef} style={{width: '100%', height}} />
        </Col>
        <Col xs={24} sm={12}>
          <canvas ref={originalCanvasRef} style={{width: '100%', height}} />
        </Col>
      </Row>
    </LoadingIndicator>
  );
};
