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
import type {RadioChangeEvent} from 'antd';
import {App, Button, Card, Col, Grid, Radio, Row, Space, Spin, Typography} from 'antd';
import Meta from 'antd/es/card/Meta';
import {saveAs} from 'file-saver';
import type {ChangeEvent} from 'react';
import {useEffect, useMemo, useState} from 'react';

import {EmptyImage} from '~/src/components/empty/EmptyImage';
import {FileSelect} from '~/src/components/image/FileSelect';
import {useAuth} from '~/src/hooks/useAuth';
import {useCreateObjectUrl} from '~/src/hooks/useCreateObjectUrl';
import {useOnnxModels} from '~/src/hooks/useOnnxModels';
import {hasAccessTo} from '~/src/services/auth/utils';
import {saveAppSettings} from '~/src/services/db/app-settings-db';
import {
  compareOnnxModelsByFreeTierAndPriority,
  compareOnnxModelsByPriority,
} from '~/src/services/ml/models';
import type {OnnxModel} from '~/src/services/ml/types';
import {OnnxModelType} from '~/src/services/ml/types';
import {useAppStore} from '~/src/stores/app-store';
import {getFilename} from '~/src/utils/filename';

export const ImageStyleTransfer: React.FC = () => {
  const appSettings = useAppStore(state => state.appSettings);
  const isInitialStateLoading = useAppStore(state => state.isInitialStateLoading);
  const originalImageFile = useAppStore(state => state.originalImageFile);
  const styleImageFile = useAppStore(state => state.styleImageFile);
  const styleTransferTrigger = useAppStore(state => state.styleTransferTrigger);
  const isStyleTransferLoading = useAppStore(state => state.isStyleTransferLoading);
  const styleTransferLoadingPercent = useAppStore(state => state.styleTransferLoadingPercent);
  const styleTransferLoadingTip = useAppStore(state => state.styleTransferLoadingTip);
  const styledImageBlob = useAppStore(state => state.styledImageBlob);

  const setStyleImageFile = useAppStore(state => state.setStyleImageFile);
  const loadStyledImage = useAppStore(state => state.loadStyledImage);

  const screens = Grid.useBreakpoint();

  const {notification} = App.useApp();

  const {user, isLoading: isAuthLoading} = useAuth();

  const {
    models,
    isLoading: isModelsLoading,
    isError: isModelsError,
  } = useOnnxModels(OnnxModelType.StyleTransfer);

  const modelArray: OnnxModel[] = useMemo(
    () =>
      [...(models?.values() ?? [])].sort(
        !user ? compareOnnxModelsByFreeTierAndPriority : compareOnnxModelsByPriority
      ),
    [models, user]
  );

  const [modelId, setModelId] = useState<string>();

  const model: OnnxModel | null | undefined = modelId ? models?.get(modelId) : null;

  const isLoading =
    isInitialStateLoading || isModelsLoading || isStyleTransferLoading || isAuthLoading;

  const originalImageUrl: string | undefined = useCreateObjectUrl(originalImageFile);
  const styleImageUrl: string | undefined = useCreateObjectUrl(styleImageFile);
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
    const {styleTransferModel, styleTransferImage} = appSettings;
    setModelId(
      styleTransferModel ??
        modelArray.find(({numInputs = 1}) => numInputs === 1 || styleTransferImage)?.id
    );
  }, [setStyleImageFile, appSettings, modelArray]);

  useEffect(() => {
    void loadStyledImage(model, user);
  }, [loadStyledImage, model, user, styleImageFile, styleTransferTrigger]);

  const handleModelChange = (e: RadioChangeEvent) => {
    const value = e.target.value as string;
    setModelId(value);
    void saveAppSettings({styleTransferModel: value});
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>, modelId: string) => {
    const file: File | null = e.target.files?.[0] ?? null;
    void setStyleImageFile(file);
    setModelId(modelId);
  };

  const handleSaveClick = () => {
    if (styledImageUrl) {
      saveAs(styledImageUrl, getFilename(originalImageFile, 'styled'));
    }
  };

  if (!originalImageFile) {
    return <EmptyImage feature="transfer artistic styles to a photo" />;
  }

  const height = `calc((100dvh - 75px) / ${screens.sm ? '1' : '2 - 8px'})`;
  const margin = screens.sm ? 0 : 8;

  return (
    <Spin
      spinning={isLoading}
      percent={styleTransferLoadingPercent}
      tip={styleTransferLoadingTip}
      size="large"
    >
      <Row>
        <Col xs={24} sm={12} lg={16} style={{display: 'flex', justifyContent: 'center'}}>
          <img
            src={styledImageUrl ?? originalImageUrl}
            alt="Styled reference photo"
            style={{
              display: 'block',
              maxWidth: '100%',
              maxHeight: height,
              objectFit: 'contain',
              marginBottom: margin,
            }}
          />
        </Col>
        <Col
          xs={24}
          sm={12}
          lg={8}
          style={{
            maxHeight: height,
            marginTop: margin,
            overflowY: 'auto',
          }}
        >
          <Space direction="vertical" style={{display: 'flex', padding: '0 16px 16px'}}>
            <Typography.Text strong>
              Select a style to transfer to your reference photo
            </Typography.Text>

            {styledImageUrl && (
              <Button icon={<DownloadOutlined />} onClick={handleSaveClick}>
                Save
              </Button>
            )}

            {!user && (
              <Typography.Text type="secondary">
                Only a limited number of styles are available in the free version
              </Typography.Text>
            )}

            <Radio.Group
              value={modelId}
              onChange={handleModelChange}
              options={modelArray.map((model: OnnxModel) => {
                const {id, name, description, image, numInputs = 1} = model;
                const isAccessAllowed = hasAccessTo(user, model);
                const imageUrl = numInputs > 1 ? styleImageUrl : image;
                return {
                  value: id,
                  label: (
                    <Card
                      key={id}
                      hoverable
                      cover={
                        imageUrl && (
                          <img
                            src={imageUrl}
                            alt={name}
                            crossOrigin="anonymous"
                            style={{
                              display: 'block',
                              maxHeight: 200,
                              objectFit: 'contain',
                            }}
                          />
                        )
                      }
                      actions={
                        numInputs > 1
                          ? [
                              <FileSelect
                                key={id}
                                onChange={e => {
                                  handleFileChange(e, id);
                                }}
                                disabled={!isAccessAllowed}
                              >
                                Select style image
                              </FileSelect>,
                            ]
                          : []
                      }
                    >
                      <Meta
                        title={name}
                        description={
                          (description || !isAccessAllowed) && (
                            <Space direction="vertical">
                              {description && (
                                <Typography.Text type="secondary">{description}</Typography.Text>
                              )}
                              {!isAccessAllowed && (
                                <Typography.Text type="warning">
                                  This style is available to paid Patreon members only
                                </Typography.Text>
                              )}
                            </Space>
                          )
                        }
                      />
                    </Card>
                  ),
                  disabled: !isAccessAllowed,
                };
              })}
              style={{display: 'flex', flexDirection: 'column', gap: 8}}
            />
          </Space>
        </Col>
      </Row>
    </Spin>
  );
};
