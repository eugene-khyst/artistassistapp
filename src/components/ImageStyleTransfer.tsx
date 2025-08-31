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

import {DownloadOutlined, LoadingOutlined} from '@ant-design/icons';
import {Trans, useLingui} from '@lingui/react/macro';
import type {RadioChangeEvent} from 'antd';
import {App, Button, Card, Col, Grid, Radio, Row, Space, Spin, Typography} from 'antd';
import Meta from 'antd/es/card/Meta';
import {saveAs} from 'file-saver';
import {useEffect, useMemo, useRef, useState} from 'react';

import {EmptyImage} from '~/src/components/empty/EmptyImage';
import {FileSelect} from '~/src/components/file/FileSelect';
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
  const user = useAppStore(state => state.auth?.user);
  const isAuthLoading = useAppStore(state => state.isAuthLoading);
  const appSettings = useAppStore(state => state.appSettings);
  const originalImageFile = useAppStore(state => state.originalImageFile);
  const styleImageFile = useAppStore(state => state.styleImageFile);
  const isStyleTransferLoading = useAppStore(state => state.isStyleTransferLoading);
  const styleTransferLoadingTip = useAppStore(state => state.styleTransferLoadingTip);
  const styledImageBlob = useAppStore(state => state.styledImageBlob);

  const setStyleTransferModel = useAppStore(state => state.setStyleTransferModel);
  const setStyleImageFile = useAppStore(state => state.setStyleImageFile);

  const screens = Grid.useBreakpoint();

  const {notification} = App.useApp();

  const {t} = useLingui();

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

  const radioGroupRef = useRef<HTMLDivElement>(null);

  const isLoading: boolean = isModelsLoading || isStyleTransferLoading || isAuthLoading;

  const originalImageUrl: string | undefined = useCreateObjectUrl(originalImageFile);
  const styleImageUrl: string | undefined = useCreateObjectUrl(styleImageFile);
  const styledImageUrl: string | undefined = useCreateObjectUrl(styledImageBlob);

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
    const {styleTransferModel, styleTransferImage} = appSettings;
    let model: OnnxModel | undefined;
    if (styleTransferModel) {
      model = models.get(styleTransferModel);
    }
    model ??= [...models.values()]
      .sort(!user ? compareOnnxModelsByFreeTierAndPriority : compareOnnxModelsByPriority)
      .find(({numInputs = 1}) => numInputs === 1 || styleTransferImage);
    setModelId(model?.id);
    setStyleTransferModel(model);
    if (model?.id) {
      radioGroupRef.current
        ?.querySelector(`input[value="${model.id}"]`)
        ?.closest('.ant-radio-wrapper')
        ?.scrollIntoView();
    }
  }, [setStyleTransferModel, appSettings, models, user, isAuthLoading]);

  const handleModelChange = (e: RadioChangeEvent) => {
    const value = e.target.value as string;
    setModelId(value);
    setStyleTransferModel(models?.get(value));
    void saveAppSettings({styleTransferModel: value});
  };

  const handleFileChange = ([file]: File[], modelId: string) => {
    void setStyleImageFile(file);
    setModelId(modelId);
  };

  const handleSaveClick = () => {
    if (styledImageUrl) {
      saveAs(styledImageUrl, getFilename(originalImageFile, 'styled'));
    }
  };

  if (!originalImageFile) {
    return <EmptyImage />;
  }

  const height = `calc((100dvh - 75px) / ${screens.sm ? '1' : '2 - 8px'})`;
  const margin = screens.sm ? 0 : 8;

  return (
    <Spin
      spinning={isLoading}
      tip={styleTransferLoadingTip}
      indicator={<LoadingOutlined spin />}
      size="large"
    >
      <Row>
        <Col xs={24} sm={12} lg={16} style={{display: 'flex', justifyContent: 'center'}}>
          <img
            src={styledImageUrl ?? originalImageUrl}
            alt={t`Styled reference photo`}
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
              <Trans>Select a style to transfer to your reference photo</Trans>
            </Typography.Text>

            {styledImageUrl && (
              <Button icon={<DownloadOutlined />} onClick={handleSaveClick}>
                <Trans>Save</Trans>
              </Button>
            )}

            {!user && (
              <Typography.Text type="secondary">
                <Trans>Only a limited number of styles are available in the free version</Trans>
              </Typography.Text>
            )}

            <Radio.Group
              ref={radioGroupRef}
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
                                onChange={(files: File[]) => {
                                  handleFileChange(files, id);
                                }}
                                disabled={!isAccessAllowed}
                              >
                                <Trans>Select style image</Trans>
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
                                  <Trans>
                                    This style is available to paid Patreon members only
                                  </Trans>
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
