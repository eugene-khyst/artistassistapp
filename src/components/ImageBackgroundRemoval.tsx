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

import {CloseCircleOutlined, DownloadOutlined, MoreOutlined} from '@ant-design/icons';
import {Trans, useLingui} from '@lingui/react/macro';
import {App, Button, Divider, Dropdown, Flex, Form, Grid, Space, Typography} from 'antd';
import type {AggregationColor} from 'antd/es/color-picker/color';
import {clsx} from 'clsx';
import {saveAs} from 'file-saver';
import type {CSSProperties, ReactElement, ReactNode} from 'react';
import {cloneElement, useCallback, useEffect, useMemo, useState} from 'react';
import {ReactCompareSlider, ReactCompareSliderImage} from 'react-compare-slider';

import {ColorPicker} from '~/src/components/color/ColorPicker';
import {FileSelect} from '~/src/components/file/FileSelect';
import {LoadingIndicator} from '~/src/components/loading/LoadingIndicator';
import {OnnxModelSelect} from '~/src/components/ml-model/OnnxModelSelect';
import {useCreateObjectUrl} from '~/src/hooks/useCreateObjectUrl';
import {useDebounce} from '~/src/hooks/useDebounce';
import {useOnnxModels} from '~/src/hooks/useOnnxModels';
import {hasAccessTo} from '~/src/services/auth/utils';
import {WHITE_HEX} from '~/src/services/color/space/rgb';
import {getDefaultModel} from '~/src/services/ml/models';
import type {OnnxModel} from '~/src/services/ml/types';
import {OnnxModelType} from '~/src/services/ml/types';
import {useAppStore} from '~/src/stores/app-store';
import {getFilename} from '~/src/utils/filename';

import styles from './ImageBackgroundRemoval.module.css';

const menuStyle: CSSProperties = {boxShadow: 'none'};
const compareImageStyle: CSSProperties = {objectFit: 'contain'};

export function ImageBackgroundRemoval() {
  const user = useAppStore(state => state.auth?.user);
  const isAuthLoading = useAppStore(state => state.isAuthLoading);
  const backgroundRemovalModel = useAppStore(state => state.appSettings.backgroundRemovalModel);
  const imageFileToRemoveBackground = useAppStore(state => state.imageFileToRemoveBackground);
  const backgroundRemovalColor = useAppStore(state => state.backgroundRemovalColor);
  const isBackgroundRemovalLoading = useAppStore(state => state.isBackgroundRemovalLoading);
  const backgroundRemovalDownloadTip = useAppStore(state => state.backgroundRemovalDownloadTip);
  const imageWithoutBackgroundBlob = useAppStore(state => state.imageWithoutBackgroundBlob);

  const setImageFileToRemoveBackground = useAppStore(state => state.setImageFileToRemoveBackground);
  const setBackgroundRemovalModel = useAppStore(state => state.setBackgroundRemovalModel);
  const setBackgroundRemovalColor = useAppStore(state => state.setBackgroundRemovalColor);
  const abortBackgroundRemoval = useAppStore(state => state.abortBackgroundRemoval);
  const saveAppSettings = useAppStore(state => state.saveAppSettings);

  const screens = Grid.useBreakpoint();

  const {notification} = App.useApp();

  const {t} = useLingui();

  const {
    models,
    isLoading: isModelsLoading,
    isError: isModelsError,
  } = useOnnxModels(OnnxModelType.BackgroundRemoval);

  // null = explicit cancel; undefined = use default
  const [selectedModelId, setSelectedModelId] = useState<string | null>();

  const defaultModel = useMemo<OnnxModel | undefined>(() => {
    if (isAuthLoading || !models?.size) {
      return undefined;
    }
    return (
      (backgroundRemovalModel && models.get(backgroundRemovalModel)) ||
      getDefaultModel(models, user)
    );
  }, [backgroundRemovalModel, models, user, isAuthLoading]);

  const modelId = selectedModelId === null ? undefined : (selectedModelId ?? defaultModel?.id);
  const model: OnnxModel | undefined = modelId ? models?.get(modelId) : undefined;
  const isAccessAllowed: boolean = !model || (!isAuthLoading && hasAccessTo(user, model));

  const isLoading: boolean = isModelsLoading || isBackgroundRemovalLoading || isAuthLoading;

  const imageUrl: string | undefined = useCreateObjectUrl(imageFileToRemoveBackground);
  const imageWithoutBackgroundUrl: string | undefined = useCreateObjectUrl(
    imageWithoutBackgroundBlob
  );

  const isBackgroundRemovalLoadingDebounced = useDebounce(isBackgroundRemovalLoading, 100);

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
    setBackgroundRemovalModel(modelId ? models.get(modelId) : undefined);
  }, [modelId, models, setBackgroundRemovalModel, isAuthLoading]);

  const position = isBackgroundRemovalLoadingDebounced ? 100 : 25;

  const handleModelChange = (value: string) => {
    setSelectedModelId(value);
    void saveAppSettings({backgroundRemovalModel: value});
  };

  const handleFileChange = ([file]: File[]) => {
    setImageFileToRemoveBackground(file ?? null);
    if (!modelId) {
      const model: OnnxModel | undefined =
        (backgroundRemovalModel && models?.get(backgroundRemovalModel)) ||
        getDefaultModel(models, user);
      setSelectedModelId(model?.id);
    }
  };

  const handleSaveClick = () => {
    if (imageWithoutBackgroundUrl) {
      saveAs(imageWithoutBackgroundUrl, getFilename(imageFileToRemoveBackground, 'no-background'));
    }
  };

  const handleCancelClick = () => {
    abortBackgroundRemoval();
    setSelectedModelId(null);
    setBackgroundRemovalModel(undefined);
  };

  const colorPicker = useMemo(
    () => (
      <Form.Item label={t`Background`} className="u-mb-0">
        <Space.Compact>
          <ColorPicker
            title={t`Background`}
            presets={[
              {
                label: t`White`,
                colors: [WHITE_HEX],
              },
            ]}
            disabledAlpha
            value={backgroundRemovalColor ?? undefined}
            onChangeComplete={(color: AggregationColor) => {
              setBackgroundRemovalColor(color.toHexString());
            }}
            classNames={{popup: {root: 'color-picker-high-z-index'}}}
          />
          <Button
            icon={<CloseCircleOutlined />}
            title={t`Clear background color`}
            onClick={() => {
              setBackgroundRemovalColor(null);
            }}
          />
        </Space.Compact>
      </Form.Item>
    ),
    [t, backgroundRemovalColor, setBackgroundRemovalColor]
  );

  const popupRender = useCallback(
    (menu: ReactNode) => (
      <div className="u-popup-panel">
        <div className="u-popup-content">{colorPicker}</div>
        <Divider className="u-m-0" />
        {cloneElement(
          menu as ReactElement<{
            style: CSSProperties;
          }>,
          {style: menuStyle}
        )}
      </div>
    ),
    [colorPicker]
  );

  return (
    <LoadingIndicator
      loading={isLoading}
      downloadTip={backgroundRemovalDownloadTip}
      onCancel={handleCancelClick}
    >
      <Flex vertical gap="small" className="u-tab-toolbar">
        <Typography.Text strong>
          <Trans>Select a photo to remove the background from</Trans>
        </Typography.Text>
        <Form.Item
          className="u-m-0"
          extra={
            !user &&
            (isAccessAllowed ? (
              <Typography.Text type="secondary">
                <Trans>Only a limited number of modes are available in the free version</Trans>
              </Typography.Text>
            ) : (
              <Typography.Text type="warning">
                <Trans>
                  You&apos;ve selected a mode that is available to paid Patreon members only
                </Trans>
              </Typography.Text>
            ))
          }
        >
          <Space className="u-flex">
            {isAccessAllowed && (
              <FileSelect onChange={handleFileChange} useReferencePhoto>
                <Trans>Select photo</Trans>
              </FileSelect>
            )}
            <Form.Item
              label={screens.sm ? t`Mode` : null}
              className="u-m-0"
              validateStatus={!isAccessAllowed ? 'warning' : undefined}
            >
              <OnnxModelSelect
                models={models}
                value={modelId}
                onChange={handleModelChange}
                className={styles['modelSelect']}
              />
            </Form.Item>
            {screens.sm ? (
              <>
                {colorPicker}
                {imageWithoutBackgroundUrl && (
                  <Button icon={<DownloadOutlined />} onClick={handleSaveClick}>
                    <Trans>Save</Trans>
                  </Button>
                )}
              </>
            ) : (
              <Dropdown
                trigger={['click']}
                menu={{
                  items: [
                    ...(imageWithoutBackgroundUrl
                      ? [
                          {
                            key: 'save',
                            label: t`Save`,
                            icon: <DownloadOutlined />,
                            onClick: handleSaveClick,
                          },
                        ]
                      : []),
                  ],
                }}
                popupRender={popupRender}
              >
                <Button icon={<MoreOutlined />} />
              </Dropdown>
            )}
          </Space>
        </Form.Item>
      </Flex>

      <ReactCompareSlider
        position={position}
        itemOne={
          imageUrl && (
            <ReactCompareSliderImage
              src={imageUrl}
              alt={t`Original photo`}
              className={styles['compareImage']}
              style={compareImageStyle}
            />
          )
        }
        itemTwo={
          imageWithoutBackgroundUrl && (
            <ReactCompareSliderImage
              src={imageWithoutBackgroundUrl}
              alt={t`Image without background`}
              className={clsx(styles['compareImage'], styles['whiteBackground'])}
              style={compareImageStyle}
            />
          )
        }
      />
    </LoadingIndicator>
  );
}
