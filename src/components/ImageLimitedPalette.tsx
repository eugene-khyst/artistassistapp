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
  PictureOutlined,
  PrinterOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import {
  type ColorId,
  isMixable,
  MIXABLE_COLOR_TYPES,
  toColorIds,
} from '@eugene-khyst/artistassistapp-color-mixer';
import {Trans, useLingui} from '@lingui/react/macro';
import {Button, Dropdown, Form, Grid, Space, Typography} from 'antd';
import {useState} from 'react';

import {LoadingIndicator} from '@/components/loading/LoadingIndicator';
import {useColorSetReset} from '@/hooks/useColorSetReset';
import {useImageActions} from '@/hooks/useImageActions';
import {useZoomableImageCanvas} from '@/hooks/useZoomableImageCanvas';
import {NOOP_CANVAS_MODE_SUPPLIER} from '@/services/canvas/mode/canvas-mode';
import {useAppStore} from '@/stores/app-store';

import {ColorCascader} from './color-set/ColorCascader';
import {EmptyColorSet} from './empty/EmptyColorSet';
import styles from './ImageLimitedPalette.module.css';

const MAX_COLORS = 7;
const FILENAME_SUFFIX = 'limited-palette';

export function ImageLimitedPalette() {
  const colorSet = useAppStore(state => state.colorSet);
  const selectedImageFile = useAppStore(state => state.selectedImageFile);
  const originalImage = useAppStore(state => state.originalImage);
  const limitedColorSet = useAppStore(state => state.limitedColorSet);
  const limitedPaletteImage = useAppStore(state => state.limitedPaletteImage);

  const isOriginalImageLoading = useAppStore(state => state.isOriginalImageLoading);
  const isLimitedPaletteImageLoading = useAppStore(state => state.isLimitedPaletteImageLoading);

  const setLimitedColorSet = useAppStore(state => state.setLimitedColorSet);
  const setLimitedColorSetAsMain = useAppStore(state => state.setLimitedColorSetAsMain);
  const abortLimitedPalette = useAppStore(state => state.abortLimitedPalette);

  const screens = Grid.useBreakpoint();

  const {t} = useLingui();

  const [colorIds, setColorIds] = useState<ColorId[]>([]);

  const {zoomableImageCanvas, ref: limitedPaletteCanvasRef} = useZoomableImageCanvas(
    NOOP_CANVAS_MODE_SUPPLIER,
    limitedPaletteImage,
    selectedImageFile?.digest
  );

  const {ref: originalCanvasRef} = useZoomableImageCanvas(
    NOOP_CANVAS_MODE_SUPPLIER,
    originalImage,
    selectedImageFile?.digest
  );

  const isLoading: boolean = isOriginalImageLoading || isLimitedPaletteImageLoading;

  const isCancelable: boolean = isLimitedPaletteImageLoading;

  // The selection follows the applied palette, which survives promotion to the main color set.
  useColorSetReset(colorIds, () => {
    setColorIds(toColorIds(limitedColorSet?.colors));
  });

  const handlePaintClick = () => {
    void setLimitedColorSet(colorIds);
  };

  const {print, save, setAsReference} = useImageActions({
    canvas: zoomableImageCanvas,
    image: limitedPaletteImage,
    filenameSuffix: FILENAME_SUFFIX,
  });

  if (!colorSet || !originalImage || !isMixable(colorSet.type)) {
    return <EmptyColorSet supportedColorTypes={MIXABLE_COLOR_TYPES} imageMandatory />;
  }

  return (
    <LoadingIndicator loading={isLoading} onCancel={isCancelable && abortLimitedPalette}>
      <div className="u-tab-view">
        <div>
          <Form.Item
            label={screens.sm ? <Trans>Colors</Trans> : null}
            labelCol={{className: 'u-pb-0'}}
            tooltip={
              <Trans>
                Using a limited palette helps achieve color harmony. Select 1–{MAX_COLORS} primary
                colors.
              </Trans>
            }
            className={styles['colorsFormItem']}
            extra={
              <Typography.Text type={colorIds.length > MAX_COLORS ? 'danger' : 'secondary'}>
                <Trans>Select from 1 to {MAX_COLORS} colors</Trans>
              </Typography.Text>
            }
            validateStatus={colorIds.length > MAX_COLORS ? 'error' : undefined}
          >
            <Space.Compact block>
              <ColorCascader
                aria-label={t`Colors`}
                value={colorIds}
                onChange={setColorIds}
                multiple
                maxTagCount="responsive"
                className={styles['cascader']}
              />
              <Button
                type="primary"
                onClick={handlePaintClick}
                disabled={!colorIds.length || colorIds.length > MAX_COLORS}
              >
                <Trans>Paint</Trans>
              </Button>
              <Dropdown
                trigger={['click']}
                menu={{
                  items: [
                    {
                      key: 'print',
                      label: <Trans>Print</Trans>,
                      icon: <PrinterOutlined />,
                      onClick: print,
                      disabled: !limitedPaletteImage,
                    },
                    {
                      key: 'save',
                      label: <Trans>Save</Trans>,
                      icon: <DownloadOutlined />,
                      onClick: () => {
                        void save();
                      },
                      disabled: !limitedPaletteImage,
                    },
                    {
                      key: 'set-as-reference',
                      label: <Trans>Set as reference</Trans>,
                      icon: <PictureOutlined />,
                      onClick: () => {
                        void setAsReference();
                      },
                      disabled: !limitedPaletteImage,
                    },
                    {
                      key: 'set-as-main-color-set',
                      label: <Trans>Set as main color set</Trans>,
                      icon: <SwapOutlined />,
                      onClick: () => {
                        void setLimitedColorSetAsMain();
                      },
                      disabled: !limitedColorSet,
                    },
                  ],
                }}
              >
                <Button icon={<DownOutlined />} aria-label={t`More actions`} />
              </Dropdown>
            </Space.Compact>
          </Form.Item>
        </div>
        <div className={styles['previews']}>
          <canvas ref={limitedPaletteCanvasRef} className={styles['previewCanvas']} />
          <canvas ref={originalCanvasRef} className={styles['previewCanvas']} />
        </div>
      </div>
    </LoadingIndicator>
  );
}
