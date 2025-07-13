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
import {App, Button, Dropdown, Form, Grid, Radio, Space, Spin, Typography} from 'antd';
import {saveAs} from 'file-saver';
import {useEffect, useState} from 'react';

import {PrintImageDrawer} from '~/src/components/print/PrintImageDrawer';
import {useOnnxModels} from '~/src/hooks/useOnnxModels';
import {
  useZoomableImageCanvas,
  zoomableImageCanvasSupplier,
} from '~/src/hooks/useZoomableImageCanvas';
import type {ZoomableImageCanvas} from '~/src/services/canvas/image/zoomable-image-canvas';
import {saveAppSettings} from '~/src/services/db/app-settings-db';
import type {OnnxModel} from '~/src/services/ml/types';
import {OnnxModelType} from '~/src/services/ml/types';
import {OutlineMode} from '~/src/services/settings/types';
import {useAppStore} from '~/src/stores/app-store';
import {getFilename} from '~/src/utils/filename';
import {imageBitmapToBlob} from '~/src/utils/graphics';

import {EmptyImage} from './empty/EmptyImage';

export const ImageOutline: React.FC = () => {
  const user = useAppStore(state => state.auth?.user);
  const isAuthLoading = useAppStore(state => state.isAuthLoading);
  const appSettings = useAppStore(state => state.appSettings);
  const originalImageFile = useAppStore(state => state.originalImageFile);
  const isOutlineImageLoading = useAppStore(state => state.isOutlineImageLoading);
  const outlineLoadingTip = useAppStore(state => state.outlineLoadingTip);
  const outlineImage = useAppStore(state => state.outlineImage);

  const setOutlineModel = useAppStore(state => state.setOutlineModel);

  const screens = Grid.useBreakpoint();

  const {notification} = App.useApp();

  const {t} = useLingui();

  const {
    models,
    isLoading: isModelsLoading,
    isError: isModelsError,
  } = useOnnxModels(OnnxModelType.LineDrawing);

  const {ref: canvasRef} = useZoomableImageCanvas<ZoomableImageCanvas>(
    zoomableImageCanvasSupplier,
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
    const {outlineMode} = appSettings;
    const mode: OutlineMode = (user && outlineMode) || OutlineMode.Quick;
    const model: OnnxModel | null | undefined =
      mode === OutlineMode.Quality ? models?.values().next().value : null;
    setMode(mode);
    setOutlineModel(model);
  }, [setOutlineModel, appSettings, models, user]);

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

  const handleSaveClick = async () => {
    if (!outlineImage) {
      return;
    }
    saveAs(await imageBitmapToBlob(outlineImage), getFilename(originalImageFile, 'outline'));
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
        void handleSaveClick();
      },
    },
  ];

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
