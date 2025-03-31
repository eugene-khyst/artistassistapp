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

import {DownloadOutlined} from '@ant-design/icons';
import {App, Button, Flex, Form, Space, Spin, Typography} from 'antd';
import {saveAs} from 'file-saver';
import type {CSSProperties} from 'react';
import {useEffect, useState} from 'react';

import {EmptyImage} from '~/src/components/empty/EmptyImage';
import {OnnxModelSelect} from '~/src/components/ml-model/OnnxModelSelect';
import {useAuth} from '~/src/hooks/useAuth';
import {useCreateObjectUrl} from '~/src/hooks/useCreateObjectUrl';
import {useOnnxModels} from '~/src/hooks/useOnnxModels';
import {hasAccessTo} from '~/src/services/auth/utils';
import {saveAppSettings} from '~/src/services/db/app-settings-db';
import {compareOnnxModelsByPriority} from '~/src/services/ml/models';
import type {OnnxModel} from '~/src/services/ml/types';
import {OnnxModelType} from '~/src/services/ml/types';
import {useAppStore} from '~/src/stores/app-store';
import {getFilename} from '~/src/utils/filename';

export const ImageStyleTransfer: React.FC = () => {
  const appSettings = useAppStore(state => state.appSettings);
  const originalImageFile = useAppStore(state => state.originalImageFile);
  const styleTransferTrigger = useAppStore(state => state.styleTransferTrigger);
  const isStyleTransferLoading = useAppStore(state => state.isStyleTransferLoading);
  const styleTransferLoadingPercent = useAppStore(state => state.styleTransferLoadingPercent);
  const styleTransferLoadingTip = useAppStore(state => state.styleTransferLoadingTip);
  const styledImageBlob = useAppStore(state => state.styledImageBlob);

  const loadStyledImage = useAppStore(state => state.loadStyledImage);

  const {notification} = App.useApp();

  const {user, isLoading: isAuthLoading} = useAuth();

  const {
    models,
    isLoading: isModelsLoading,
    isError: isModelsError,
  } = useOnnxModels(OnnxModelType.StyleTransfer);

  const [modelId, setModelId] = useState<string>();

  const model: OnnxModel | null | undefined = modelId ? models?.get(modelId) : null;

  const isAccessAllowed: boolean = !model || (!isAuthLoading && hasAccessTo(user, model));

  const isLoading = isModelsLoading || isStyleTransferLoading || isAuthLoading;

  const styledImageUrl: string | undefined = useCreateObjectUrl(styledImageBlob);

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
    const {styleTransferModel} = appSettings;
    setModelId(
      styleTransferModel ?? [...(models?.values() ?? [])].sort(compareOnnxModelsByPriority)[0]?.id
    );
  }, [appSettings, models]);

  useEffect(() => {
    void loadStyledImage(model, user);
  }, [loadStyledImage, model, user, styleTransferTrigger]);

  const handleModelChange = (value: string) => {
    setModelId(value);
    void saveAppSettings({styleTransferModel: value});
  };

  const handleSaveClick = () => {
    if (styledImageUrl) {
      saveAs(styledImageUrl, getFilename(originalImageFile, 'styled'));
    }
  };

  if (!originalImageFile) {
    return <EmptyImage feature="transfer artistic styles to a photo" />;
  }

  const imageStyle: CSSProperties = {
    maxWidth: '100%',
    maxHeight: `calc(100vh - 145px)`,
    objectFit: 'contain',
  };

  return (
    <Spin
      spinning={isLoading}
      percent={styleTransferLoadingPercent}
      tip={styleTransferLoadingTip}
      size="large"
    >
      <Flex vertical gap="small" style={{marginBottom: 8, padding: '0 16px'}}>
        <Typography.Text strong>Select a style to transfer to your reference</Typography.Text>
        <Form.Item
          style={{margin: 0}}
          extra={
            !user &&
            (!isAccessAllowed ? (
              <Typography.Text type="warning">
                You&apos;ve selected style that is available to paid Patreon members only
              </Typography.Text>
            ) : (
              <Typography.Text type="secondary">
                Only a limited number of styles are available in the free version
              </Typography.Text>
            ))
          }
        >
          <Space align="start" style={{display: 'flex'}}>
            <Form.Item
              label="Style"
              style={{margin: 0}}
              validateStatus={!isAccessAllowed ? 'warning' : undefined}
            >
              <OnnxModelSelect
                models={models}
                value={modelId}
                onChange={handleModelChange}
                style={{width: 140}}
              />
            </Form.Item>
            {styledImageUrl && (
              <Button icon={<DownloadOutlined />} onClick={handleSaveClick}>
                Save
              </Button>
            )}
          </Space>
        </Form.Item>
      </Flex>

      <div style={{display: 'flex', justifyContent: 'center'}}>
        {styledImageUrl && (
          <img
            src={styledImageUrl}
            alt="Styled reference"
            style={{backgroundColor: '#fff', ...imageStyle}}
          />
        )}
      </div>
    </Spin>
  );
};
