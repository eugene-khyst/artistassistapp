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
import {Button, Card, Col, Radio, Row, Space, Typography} from 'antd';
import {saveAs} from 'file-saver';
import {useEffect, useMemo, useRef} from 'react';

import {EmptyImage} from '@/components/empty/EmptyImage';
import {FileSelect} from '@/components/file/FileSelect';
import {LoadingIndicator} from '@/components/loading/LoadingIndicator';
import {useCreateObjectUrl} from '@/hooks/useCreateObjectUrl';
import {useImageFileToBlob} from '@/hooks/useImageFileToBlob';
import {useSelectedOnnxModel} from '@/hooks/useSelectedOnnxModel';
import {hasAccessTo} from '@/services/auth/utils';
import type {OnnxModel} from '@/services/ml/types';
import {OnnxModelType} from '@/services/ml/types';
import {useAppStore} from '@/stores/app-store';
import {getFilename} from '@/utils/filename';

import styles from './ImageStyleTransfer.module.css';

export function ImageStyleTransfer() {
  const user = useAppStore(state => state.auth?.user);
  const isAuthLoading = useAppStore(state => state.isAuthLoading);
  const styleTransferImage = useAppStore(state => state.appSettings.styleTransferImage);
  const imageFile = useAppStore(state => state.imageFile);
  const isStyleTransferLoading = useAppStore(state => state.isStyleTransferLoading);
  const styleTransferDownloadTip = useAppStore(state => state.styleTransferDownloadTip);
  const styledImageBlob = useAppStore(state => state.styledImageBlob);

  const setStyleTransferModel = useAppStore(state => state.setStyleTransferModel);
  const setStyleImageFile = useAppStore(state => state.setStyleImageFile);
  const abortStyleTransfer = useAppStore(state => state.abortStyleTransfer);

  const {t} = useLingui();

  const {
    sortedModels,
    defaultModel,
    modelId,
    selectedModelId,
    isModelsLoading,
    selectModel,
    setSelectedModelId,
  } = useSelectedOnnxModel({
    type: OnnxModelType.StyleTransfer,
    settingsKey: 'styleTransferModel',
    setModel: setStyleTransferModel,
    defaultPredicate: ({numInputs = 1}) => numInputs === 1 || !!styleTransferImage,
  });

  const radioGroupRef = useRef<HTMLDivElement>(null);
  const hasScrolledToDefaultRef = useRef(false);

  const isLoading: boolean = isModelsLoading || isStyleTransferLoading || isAuthLoading;

  const styleImageBlob: Blob | undefined = useImageFileToBlob(styleTransferImage);
  const originalImageBlob: Blob | undefined = useImageFileToBlob(imageFile);
  const originalImageUrl: string | undefined = useCreateObjectUrl(originalImageBlob);
  const styleImageUrl: string | undefined = useCreateObjectUrl(styleImageBlob);
  const styledImageUrl: string | undefined = useCreateObjectUrl(styledImageBlob);

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
    selectModel(e.target.value as string);
  };

  const handleSaveClick = () => {
    if (styledImageUrl) {
      saveAs(styledImageUrl, getFilename(imageFile, 'styled'));
    }
  };

  const handleCancelClick = () => {
    abortStyleTransfer();
    setSelectedModelId(null);
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
                    className={styles['coverImage']}
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
    [sortedModels, user, styleImageUrl, setStyleImageFile, setSelectedModelId]
  );

  if (!imageFile) {
    return <EmptyImage />;
  }

  return (
    <LoadingIndicator
      loading={isLoading}
      downloadTip={styleTransferDownloadTip}
      onCancel={handleCancelClick}
    >
      <Row>
        <Col xs={24} sm={12} lg={16} className={styles['imageColumn']}>
          <img
            src={styledImageUrl ?? originalImageUrl}
            alt={t`Styled reference photo`}
            className={styles['previewImage']}
          />
        </Col>
        <Col xs={24} sm={12} lg={8} className={styles['sidePanel']}>
          <Space vertical className={styles['header']}>
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

          <div className={styles['optionsScroll']}>
            <Radio.Group
              ref={radioGroupRef}
              value={modelId}
              onChange={handleModelChange}
              options={radioOptions}
              className={styles['radioGroup']}
            />
          </div>
        </Col>
      </Row>
    </LoadingIndicator>
  );
}
