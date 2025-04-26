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

import {DownloadOutlined, MoreOutlined, PrinterOutlined} from '@ant-design/icons';
import type {CheckboxOptionType, MenuProps, RadioChangeEvent} from 'antd';
import {App, Button, Dropdown, Form, Grid, Radio, Space, Spin, Typography} from 'antd';
import {useEffect, useState} from 'react';

import {PrintImageDrawer} from '~/src/components/print/PrintImageDrawer';
import {useAuth} from '~/src/hooks/useAuth';
import {useOnnxModels} from '~/src/hooks/useOnnxModels';
import {
  useZoomableImageCanvas,
  zoomableImageCanvasSupplier,
} from '~/src/hooks/useZoomableImageCanvas';
import type {ZoomableImageCanvas} from '~/src/services/canvas/image/zoomable-image-canvas';
import {compareOnnxModelsByPriority} from '~/src/services/ml/models';
import {OnnxModelType} from '~/src/services/ml/types';
import {useAppStore} from '~/src/stores/app-store';
import {getFilename} from '~/src/utils/filename';

import {EmptyImage} from './empty/EmptyImage';

enum OutlineMode {
  Quick = 0,
  Quality = 1,
}

export const ImageOutline: React.FC = () => {
  const originalImageFile = useAppStore(state => state.originalImageFile);
  const outlineTrigger = useAppStore(state => state.outlineTrigger);
  const isOutlineImageLoading = useAppStore(state => state.isOutlineImageLoading);
  const outlineLoadingPercent = useAppStore(state => state.outlineLoadingPercent);
  const outlineLoadingTip = useAppStore(state => state.outlineLoadingTip);
  const outlineImage = useAppStore(state => state.outlineImage);

  const loadOutlineImage = useAppStore(state => state.loadOutlineImage);

  const screens = Grid.useBreakpoint();

  const {notification} = App.useApp();

  const {user, isLoading: isAuthLoading} = useAuth();

  const {
    models,
    isLoading: isModelsLoading,
    isError: isModelsError,
  } = useOnnxModels(OnnxModelType.LineDrawing);

  const {ref: canvasRef, zoomableImageCanvas} = useZoomableImageCanvas<ZoomableImageCanvas>(
    zoomableImageCanvasSupplier,
    outlineImage
  );

  const [outlineMode, setOutlineMode] = useState<OutlineMode>(OutlineMode.Quick);
  const [isOpenPrintImage, setIsOpenPrintImage] = useState<boolean>(false);

  const [model] =
    outlineMode === OutlineMode.Quality && models
      ? [...models.values()].sort(compareOnnxModelsByPriority)
      : [];

  const isLoading = isModelsLoading || isOutlineImageLoading || isAuthLoading;

  useEffect(() => {
    if (isModelsError) {
      notification.error({
        message: 'Error while fetching ML model data',
        placement: 'top',
        duration: 0,
      });
    }
  }, [isModelsError, notification]);

  useEffect(() => {
    void loadOutlineImage(model, user);
  }, [loadOutlineImage, model, user, outlineTrigger]);

  const handleModeChange = (e: RadioChangeEvent) => {
    setOutlineMode(e.target.value as OutlineMode);
  };

  const handlePrintClick = () => {
    setIsOpenPrintImage(true);
  };

  const handleSaveClick = () => {
    void zoomableImageCanvas?.saveAsImage(getFilename(originalImageFile, 'outline'));
  };

  if (!originalImageFile) {
    return <EmptyImage feature="turn a photo into an outline" />;
  }

  const modeOptions: CheckboxOptionType<number>[] = [
    {
      value: OutlineMode.Quick,
      label: 'Quick',
    },
    {
      value: OutlineMode.Quality,
      label: 'Quality',
      disabled: !user,
    },
  ];

  const items: MenuProps['items'] = [
    {
      key: '1',
      label: 'Print',
      icon: <PrinterOutlined />,
      onClick: handlePrintClick,
    },
    {
      key: '2',
      label: 'Save',
      icon: <DownloadOutlined />,
      onClick: handleSaveClick,
    },
  ];

  return (
    <Spin spinning={isLoading} percent={outlineLoadingPercent} tip={outlineLoadingTip} size="large">
      <div style={{display: 'flex', width: '100%', justifyContent: 'center', marginBottom: 8}}>
        <Form.Item
          style={{margin: 0}}
          extra={
            !user && (
              <Typography.Text type="secondary">
                Quality mode is available to paid Patreon members only
              </Typography.Text>
            )
          }
        >
          <Space align="start" style={{display: 'flex'}}>
            <Form.Item label="Mode" style={{margin: 0}}>
              <Radio.Group
                options={modeOptions}
                value={outlineMode}
                onChange={handleModeChange}
                optionType="button"
                buttonStyle="solid"
              />
            </Form.Item>
            {screens.sm ? (
              <>
                <Button icon={<PrinterOutlined />} onClick={handlePrintClick}>
                  Print
                </Button>
                <Button icon={<DownloadOutlined />} onClick={handleSaveClick}>
                  Save
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
