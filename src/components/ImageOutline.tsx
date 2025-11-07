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

import {
  DownloadOutlined,
  LoadingOutlined,
  MoreOutlined,
  PrinterOutlined,
  TableOutlined,
} from '@ant-design/icons';
import {Trans, useLingui} from '@lingui/react/macro';
import type {CheckboxOptionType, MenuProps, RadioChangeEvent} from 'antd';
import {
  App,
  Button,
  Divider,
  Dropdown,
  Form,
  Grid,
  Popover,
  Radio,
  Space,
  Spin,
  theme,
  Typography,
} from 'antd';
import type {CSSProperties} from 'react';
import React, {useEffect, useState} from 'react';

import {DEFAULT_GRID_SETTINGS, setGrid} from '~/src/components/grid/grid';
import {GridControls} from '~/src/components/grid/GridControls';
import {PrintImageDrawer} from '~/src/components/print/PrintImageDrawer';
import {useOnnxModels} from '~/src/hooks/useOnnxModels';
import {useZoomableImageCanvas} from '~/src/hooks/useZoomableImageCanvas';
import {GridCanvas} from '~/src/services/canvas/image/grid-canvas';
import type {OnnxModel} from '~/src/services/ml/types';
import {OnnxModelType} from '~/src/services/ml/types';
import {OutlineMode} from '~/src/services/settings/types';
import {useAppStore} from '~/src/stores/app-store';
import {TabKey} from '~/src/tabs';
import {getFilename} from '~/src/utils/filename';

import {EmptyImage} from './empty/EmptyImage';

const defaultGridSettings = {enabled: false};

const gridCanvasSupplier = (canvas: HTMLCanvasElement): GridCanvas => {
  return new GridCanvas(canvas);
};

export const ImageOutline: React.FC = () => {
  const user = useAppStore(state => state.auth?.user);
  const isAuthLoading = useAppStore(state => state.isAuthLoading);
  const appSettings = useAppStore(state => state.appSettings);
  const originalImageFile = useAppStore(state => state.originalImageFile);
  const isOutlineImageLoading = useAppStore(state => state.isOutlineImageLoading);
  const outlineLoadingTip = useAppStore(state => state.outlineLoadingTip);
  const outlineImage = useAppStore(state => state.outlineImage);

  const setOutlineModel = useAppStore(state => state.setOutlineModel);
  const saveAppSettings = useAppStore(state => state.saveAppSettings);

  const {token} = theme.useToken();
  const screens = Grid.useBreakpoint();

  const {notification} = App.useApp();

  const {t} = useLingui();

  const {
    models,
    isLoading: isModelsLoading,
    isError: isModelsError,
  } = useOnnxModels(OnnxModelType.LineDrawing);

  const {ref: canvasRef, zoomableImageCanvas: gridCanvas} = useZoomableImageCanvas<GridCanvas>(
    gridCanvasSupplier,
    outlineImage
  );

  const [mode, setMode] = useState<OutlineMode>(OutlineMode.Quick);
  const [isOpenPrintImage, setIsOpenPrintImage] = useState<boolean>(false);

  const isLoading: boolean = isModelsLoading || isOutlineImageLoading || isAuthLoading;

  useEffect(() => {
    if (isModelsError) {
      notification.error({
        message: t`Error while fetching ML model data`,
        placement: 'top',
        duration: 0,
      });
    }
  }, [isModelsError, notification, t]);

  useEffect(() => {
    if (isAuthLoading || !models) {
      return;
    }
    const {outlineMode} = appSettings;
    const mode: OutlineMode = (user && outlineMode) || OutlineMode.Quick;
    let model: OnnxModel | null | undefined;
    if (mode === OutlineMode.Quality) {
      [model] = models.values();
    } else {
      model = null;
    }
    setMode(mode);
    setOutlineModel(model);
  }, [setOutlineModel, appSettings, models, user, isAuthLoading]);

  useEffect(() => {
    if (!gridCanvas) {
      return;
    }
    const {grids} = appSettings;
    setGrid(gridCanvas, {
      ...DEFAULT_GRID_SETTINGS,
      ...defaultGridSettings,
      ...(grids?.[TabKey.Outline] ?? {}),
    });
  }, [appSettings, gridCanvas]);

  const handleModeChange = (e: RadioChangeEvent) => {
    const value = e.target.value as OutlineMode;
    const model: OnnxModel | null | undefined =
      value === OutlineMode.Quality ? models?.values().next().value : null;
    setMode(value);
    setOutlineModel(model);
    void saveAppSettings({outlineMode: value});
  };

  const handlePrintClick = () => {
    setIsOpenPrintImage(true);
  };

  const handleSaveClick = () => {
    if (!outlineImage) {
      return;
    }
    void gridCanvas?.saveAsImage(getFilename(originalImageFile, 'outline'));
  };

  if (!originalImageFile) {
    return <EmptyImage />;
  }

  const modeOptions: CheckboxOptionType<number>[] = [
    {
      value: OutlineMode.Quick,
      label: t`Quick`,
    },
    {
      value: OutlineMode.Quality,
      label: t`Quality`,
      disabled: !user,
    },
  ];

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
        handleSaveClick();
      },
    },
  ];

  const contentStyle: CSSProperties = {
    backgroundColor: token.colorBgElevated,
    borderRadius: token.borderRadiusLG,
    boxShadow: token.boxShadowSecondary,
  };

  const menuStyle: CSSProperties = {
    boxShadow: 'none',
  };

  return (
    <Spin
      spinning={isLoading}
      tip={outlineLoadingTip}
      indicator={<LoadingOutlined spin />}
      size="large"
    >
      <div style={{display: 'flex', width: '100%', justifyContent: 'center', marginBottom: 8}}>
        <Form.Item
          style={{margin: 0}}
          extra={
            !user && (
              <Typography.Text type="secondary">
                <Trans>Quality mode is available to paid Patreon members only</Trans>
              </Typography.Text>
            )
          }
        >
          <Space align="start" style={{display: 'flex'}}>
            <Form.Item label={t`Mode`} style={{margin: 0}}>
              <Radio.Group
                options={modeOptions}
                value={mode}
                onChange={handleModeChange}
                optionType="button"
                buttonStyle="solid"
              />
            </Form.Item>
            {screens.sm ? (
              <>
                <Popover
                  trigger="click"
                  forceRender
                  content={
                    <GridControls
                      direction="vertical"
                      size="small"
                      gridCanvas={gridCanvas}
                      defaultGridSettings={defaultGridSettings}
                      disableable
                    />
                  }
                >
                  <Button icon={<TableOutlined />}>
                    <Trans>Grid</Trans>
                  </Button>
                </Popover>

                <Button icon={<PrinterOutlined />} onClick={handlePrintClick}>
                  <Trans>Print</Trans>
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={() => {
                    handleSaveClick();
                  }}
                >
                  <Trans>Save</Trans>
                </Button>
              </>
            ) : (
              <Dropdown
                menu={{items}}
                popupRender={menu => (
                  <div style={contentStyle}>
                    {React.cloneElement(
                      menu as React.ReactElement<{
                        style: React.CSSProperties;
                      }>,
                      {style: menuStyle}
                    )}
                    <Divider style={{margin: 0}} />
                    <GridControls
                      direction="vertical"
                      size={0}
                      style={{padding: '8px 16px'}}
                      gridCanvas={gridCanvas}
                      defaultGridSettings={defaultGridSettings}
                      disableable
                    />
                  </div>
                )}
              >
                <Button icon={<MoreOutlined />} />
              </Dropdown>
            )}
          </Space>
        </Form.Item>
      </div>
      <div>
        <canvas ref={canvasRef} style={{width: '100%', height: `calc(100dvh - 115px)`}} />
      </div>
      <PrintImageDrawer
        image={outlineImage}
        open={isOpenPrintImage}
        onClose={() => {
          setIsOpenPrintImage(false);
        }}
      />
    </Spin>
  );
};
