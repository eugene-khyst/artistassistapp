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

import {DownloadOutlined, MoreOutlined, PrinterOutlined, TableOutlined} from '@ant-design/icons';
import {Trans, useLingui} from '@lingui/react/macro';
import {App, Button, Divider, Dropdown, Form, Grid, Popover, Space, theme, Typography} from 'antd';
import type {CSSProperties} from 'react';
import React, {useEffect, useState} from 'react';

import {DEFAULT_GRID_SETTINGS, setGrid} from '~/src/components/grid/grid';
import {GridControls} from '~/src/components/grid/GridControls';
import {LoadingIndicator} from '~/src/components/loading/LoadingIndicator';
import {OnnxModelSelect} from '~/src/components/ml-model/OnnxModelSelect';
import {PrintImageDrawer} from '~/src/components/print/PrintImageDrawer';
import {useOnnxModels} from '~/src/hooks/useOnnxModels';
import {useZoomableImageCanvas} from '~/src/hooks/useZoomableImageCanvas';
import {hasAccessTo} from '~/src/services/auth/utils';
import {GridCanvas} from '~/src/services/canvas/image/grid-canvas';
import {getDefaultModel} from '~/src/services/ml/models';
import type {OnnxModel} from '~/src/services/ml/types';
import {OnnxModelType} from '~/src/services/ml/types';
import {useAppStore} from '~/src/stores/app-store';
import {TabKey} from '~/src/tabs';
import {getFilename} from '~/src/utils/filename';

import {EmptyImage} from './empty/EmptyImage';

const fallbackModel: OnnxModel = {
  id: 'sobel-edge-detection',
  name: 'Quick',
  url: '',
  freeTier: true,
};

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
  const outlineDownloadTip = useAppStore(state => state.outlineDownloadTip);
  const outlineImage = useAppStore(state => state.outlineImage);

  const setOutlineModel = useAppStore(state => state.setOutlineModel);
  const abortOutline = useAppStore(state => state.abortOutline);
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

  const [modelId, setModelId] = useState<string>();
  const [isOpenPrintImage, setIsOpenPrintImage] = useState<boolean>(false);

  const model: OnnxModel | null | undefined = modelId ? models?.get(modelId) : null;

  const isAccessAllowed: boolean = !model || (!isAuthLoading && hasAccessTo(user, model));

  const isLoading: boolean = isModelsLoading || isOutlineImageLoading || isAuthLoading;

  useEffect(() => {
    if (isModelsError) {
      notification.error({
        title: t`Error while fetching ML model data`,
        placement: 'top',
        duration: 10,
        showProgress: true,
      });
    }
  }, [isModelsError, notification, t]);

  useEffect(() => {
    if (isAuthLoading || !models?.size) {
      return;
    }
    const {outlineModel} = appSettings;
    const model: OnnxModel =
      (outlineModel && models.get(outlineModel)) ||
      (getDefaultModel(models, user) ?? fallbackModel);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setModelId(model.id);
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
      ...grids?.[TabKey.Outline],
    });
  }, [appSettings, gridCanvas]);

  const handleModelChange = (value: string) => {
    setModelId(value);
    setOutlineModel(models?.get(value));
    void saveAppSettings({outlineModel: value});
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

  const handleCancelClick = () => {
    abortOutline();
    const model: OnnxModel =
      getDefaultModel(
        models,
        user,
        ({url, freeTier}: OnnxModel): boolean => !url && (!!user || !!freeTier)
      ) ?? fallbackModel;
    setModelId(model.id);
    setOutlineModel(model);
  };

  if (!originalImageFile) {
    return <EmptyImage />;
  }

  const contentStyle: CSSProperties = {
    backgroundColor: token.colorBgElevated,
    borderRadius: token.borderRadiusLG,
    boxShadow: token.boxShadowSecondary,
  };

  const menuStyle: CSSProperties = {
    boxShadow: 'none',
  };

  return (
    <LoadingIndicator
      loading={isLoading}
      downloadTip={!!modelId && outlineDownloadTip}
      onCancel={!!modelId && handleCancelClick}
    >
      <div style={{display: 'flex', width: '100%', justifyContent: 'center', marginBottom: 8}}>
        <Form.Item
          style={{margin: 0}}
          extra={
            !user &&
            (isAccessAllowed ? (
              <Typography.Text type="secondary">
                <Trans>Only a limited number of modes are available in the free version</Trans>
              </Typography.Text>
            ) : (
              <Typography.Text type="warning">
                <Trans>
                  You&apos;ve selected mode that is available to paid Patreon members only
                </Trans>
              </Typography.Text>
            ))
          }
        >
          <Space align="start" style={{display: 'flex'}}>
            <Form.Item
              label={screens.sm ? t`Mode` : null}
              style={{margin: 0}}
              validateStatus={!isAccessAllowed ? 'warning' : undefined}
            >
              <OnnxModelSelect
                models={models}
                value={modelId}
                onChange={handleModelChange}
                style={{width: 120}}
              />
            </Form.Item>
            {screens.sm ? (
              <>
                <Popover
                  trigger="click"
                  forceRender
                  content={
                    <GridControls
                      orientation="vertical"
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
                        handleSaveClick();
                      },
                    },
                  ],
                }}
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
                      orientation="vertical"
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
    </LoadingIndicator>
  );
};
