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

import {DownloadOutlined} from '@ant-design/icons';
import {Trans, useLingui} from '@lingui/react/macro';
import type {RadioChangeEvent} from 'antd';
import {App, Button, Card, Col, Grid, Radio, Row, Space, Typography} from 'antd';
import {saveAs} from 'file-saver';
import type {CSSProperties} from 'react';
import {useEffect, useMemo, useRef, useState} from 'react';

import {EmptyImage} from '~/src/components/empty/EmptyImage';
import {FileSelect} from '~/src/components/file/FileSelect';
import {LoadingIndicator} from '~/src/components/loading/LoadingIndicator';
import {useCreateObjectUrl} from '~/src/hooks/useCreateObjectUrl';
import {useOnnxModels} from '~/src/hooks/useOnnxModels';
import {hasAccessTo} from '~/src/services/auth/utils';
import {compareOnnxModelsByPriority} from '~/src/services/ml/models';
import type {OnnxModel} from '~/src/services/ml/types';
import {OnnxModelType} from '~/src/services/ml/types';
import {useAppStore} from '~/src/stores/app-store';
import {getFilename} from '~/src/utils/filename';

const radioGroupStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  marginBottom: 16,
};

const coverImageStyle: CSSProperties = {
  display: 'block',
  maxHeight: 200,
  objectFit: 'contain',
};

export function ImageStyleTransfer() {
  const user = useAppStore(state => state.auth?.user);
  const isAuthLoading = useAppStore(state => state.isAuthLoading);
  const styleTransferModel = useAppStore(state => state.appSettings.styleTransferModel);
  const styleTransferImage = useAppStore(state => state.appSettings.styleTransferImage);
  const originalImageFile = useAppStore(state => state.originalImageFile);
  const styleImageFile = useAppStore(state => state.styleImageFile);
  const isStyleTransferLoading = useAppStore(state => state.isStyleTransferLoading);
  const styleTransferDownloadTip = useAppStore(state => state.styleTransferDownloadTip);
  const styledImageBlob = useAppStore(state => state.styledImageBlob);

  const setStyleTransferModel = useAppStore(state => state.setStyleTransferModel);
  const setStyleImageFile = useAppStore(state => state.setStyleImageFile);
  const abortStyleTransfer = useAppStore(state => state.abortStyleTransfer);
  const saveAppSettings = useAppStore(state => state.saveAppSettings);

  const screens = Grid.useBreakpoint();

  const {notification} = App.useApp();

  const {t} = useLingui();

  const {
    models,
    isLoading: isModelsLoading,
    isError: isModelsError,
  } = useOnnxModels(OnnxModelType.StyleTransfer);

  const sortedModels: OnnxModel[] = useMemo(
    () =>
      [...(models?.values() ?? [])].sort(compareOnnxModelsByPriority({prioritizeFreeTier: !user})),
    [models, user]
  );

  // null = explicit cancel; undefined = use default
  const [selectedModelId, setSelectedModelId] = useState<string | null>();

  const defaultModel = useMemo<OnnxModel | undefined>(() => {
    if (isAuthLoading || !models?.size) {
      return undefined;
    }
    const persisted = styleTransferModel ? models.get(styleTransferModel) : undefined;
    return (
      persisted ?? sortedModels.find(({numInputs = 1}) => numInputs === 1 || styleTransferImage)
    );
  }, [styleTransferModel, styleTransferImage, models, sortedModels, isAuthLoading]);

  const radioGroupRef = useRef<HTMLDivElement>(null);
  const hasScrolledToDefaultRef = useRef(false);

  const modelId = selectedModelId === null ? undefined : (selectedModelId ?? defaultModel?.id);

  const isLoading: boolean = isModelsLoading || isStyleTransferLoading || isAuthLoading;

  const originalImageUrl: string | undefined = useCreateObjectUrl(originalImageFile);
  const styleImageUrl: string | undefined = useCreateObjectUrl(styleImageFile);
  const styledImageUrl: string | undefined = useCreateObjectUrl(styledImageBlob);

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
    setStyleTransferModel(modelId ? models.get(modelId) : undefined);
  }, [modelId, models, setStyleTransferModel, isAuthLoading]);

  useEffect(() => {
    if (hasScrolledToDefaultRef.current || selectedModelId !== undefined || !defaultModel?.id) {
      return;
    }
    hasScrolledToDefaultRef.current = true;
    radioGroupRef.current
      ?.querySelector(`input[value="${defaultModel.id}"]`)
      ?.closest('.ant-radio-wrapper')
      ?.scrollIntoView({behavior: 'smooth', block: 'start'});
  }, [selectedModelId, defaultModel?.id]);

  const handleModelChange = (e: RadioChangeEvent) => {
    const value = e.target.value as string;
    setSelectedModelId(value);
    void saveAppSettings({styleTransferModel: value});
  };

  const handleSaveClick = () => {
    if (styledImageUrl) {
      saveAs(styledImageUrl, getFilename(originalImageFile, 'styled'));
    }
  };

  const handleCancelClick = () => {
    abortStyleTransfer();
    setSelectedModelId(null);
    setStyleTransferModel(undefined);
  };

  const radioOptions = useMemo(
    () =>
      sortedModels.map((model: OnnxModel) => {
        const {id, name, description, image, numInputs = 1} = model;
        const hasAccess = hasAccessTo(user, model);
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
                    loading="lazy"
                    style={coverImageStyle}
                  />
                )
              }
              actions={
                numInputs > 1
                  ? [
                      <FileSelect
                        key={id}
                        onChange={([file]: File[]) => {
                          void setStyleImageFile(file);
                          setSelectedModelId(id);
                        }}
                        disabled={!hasAccess}
                      >
                        <Trans>Select style image</Trans>
                      </FileSelect>,
                    ]
                  : []
              }
            >
              <Card.Meta
                title={name}
                description={
                  (description || !hasAccess) && (
                    <Space orientation="vertical">
                      {description && (
                        <Typography.Text type="secondary">{description}</Typography.Text>
                      )}
                      {!hasAccess && (
                        <Typography.Text type="warning">
                          <Trans>This style is available to paid Patreon members only</Trans>
                        </Typography.Text>
                      )}
                    </Space>
                  )
                }
              />
            </Card>
          ),
          disabled: !hasAccess,
        };
      }),
    [sortedModels, user, styleImageUrl, setStyleImageFile]
  );

  if (!originalImageFile) {
    return <EmptyImage />;
  }

  const height = `calc((100dvh - 75px) / ${screens.sm ? '1' : '2 - 8px'})`;
  const margin = screens.sm ? 0 : 8;

  return (
    <LoadingIndicator
      loading={isLoading}
      downloadTip={styleTransferDownloadTip}
      onCancel={handleCancelClick}
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
            display: 'flex',
            flexDirection: 'column',
            maxHeight: height,
            marginTop: margin,
            padding: '0 16px',
          }}
        >
          <Space vertical style={{marginBottom: 8}}>
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
          </Space>

          <div style={{flex: 1, minHeight: 0, overflowY: 'auto'}}>
            <Radio.Group
              ref={radioGroupRef}
              value={modelId}
              onChange={handleModelChange}
              options={radioOptions}
              style={radioGroupStyle}
            />
          </div>
        </Col>
      </Row>
    </LoadingIndicator>
  );
}
