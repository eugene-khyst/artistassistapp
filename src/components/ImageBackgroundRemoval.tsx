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

import {BgColorsOutlined, DownloadOutlined, LoadingOutlined, MoreOutlined} from '@ant-design/icons';
import {Trans, useLingui} from '@lingui/react/macro';
import type {MenuProps} from 'antd';
import {App, Button, ColorPicker, Dropdown, Flex, Form, Grid, Space, Spin, Typography} from 'antd';
import type {Color} from 'antd/es/color-picker';
import {saveAs} from 'file-saver';
import type {CSSProperties} from 'react';
import {useEffect, useState} from 'react';
import {ReactCompareSlider, ReactCompareSliderImage} from 'react-compare-slider';

import {FileSelect} from '~/src/components/file/FileSelect';
import {OnnxModelSelect} from '~/src/components/ml-model/OnnxModelSelect';
import {useCreateObjectUrl} from '~/src/hooks/useCreateObjectUrl';
import {useDebounce} from '~/src/hooks/useDebounce';
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

export const ImageBackgroundRemoval: React.FC = () => {
  const user = useAppStore(state => state.auth?.user);
  const isAuthLoading = useAppStore(state => state.isAuthLoading);
  const appSettings = useAppStore(state => state.appSettings);
  const imageFileToRemoveBackground = useAppStore(state => state.imageFileToRemoveBackground);
  const backgroundRemovalColor = useAppStore(state => state.backgroundRemovalColor);
  const isBackgroundRemovalLoading = useAppStore(state => state.isBackgroundRemovalLoading);
  const backgroundRemovalLoadingTip = useAppStore(state => state.backgroundRemovalLoadingTip);
  const imageWithoutBackgroundBlob = useAppStore(state => state.imageWithoutBackgroundBlob);

  const setImageFileToRemoveBackground = useAppStore(state => state.setImageFileToRemoveBackground);
  const setBackgroundRemovalModel = useAppStore(state => state.setBackgroundRemovalModel);
  const setBackgroundRemovalColor = useAppStore(state => state.setBackgroundRemovalColor);

  const screens = Grid.useBreakpoint();

  const {notification} = App.useApp();

  const {t} = useLingui();

  const {
    models,
    isLoading: isModelsLoading,
    isError: isModelsError,
  } = useOnnxModels(OnnxModelType.BackgroundRemoval);

  const [modelId, setModelId] = useState<string>();
  const [position, setPosition] = useState<number>(100);
  const [isColorPickerOpened, setIsColorPickerOpened] = useState<boolean>(false);

  const model: OnnxModel | null | undefined = modelId ? models?.get(modelId) : null;

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
    const {backgroundRemovalModel} = appSettings;
    let model: OnnxModel | undefined;
    if (backgroundRemovalModel) {
      model = models.get(backgroundRemovalModel);
    }
    if (!model) {
      [model] = [...models.values()].sort(
        !user ? compareOnnxModelsByFreeTierAndPriority : compareOnnxModelsByPriority
      );
    }
    setModelId(model?.id);
    setBackgroundRemovalModel(model);
  }, [setBackgroundRemovalModel, appSettings, models, user, isAuthLoading]);

  useEffect(() => {
    setPosition(isBackgroundRemovalLoadingDebounced ? 100 : 25);
  }, [isBackgroundRemovalLoadingDebounced]);

  const handleModelChange = (value: string) => {
    setModelId(value);
    setBackgroundRemovalModel(models?.get(value));
    void saveAppSettings({backgroundRemovalModel: value});
  };

  const handleFileChange = ([file]: File[]) => {
    setImageFileToRemoveBackground(file ?? null);
  };

  const handleSaveClick = () => {
    if (imageWithoutBackgroundUrl) {
      saveAs(imageWithoutBackgroundUrl, getFilename(imageFileToRemoveBackground, 'no-background'));
    }
  };

  const items: MenuProps['items'] = [
    {
      key: '1',
      label: t`Background`,
      icon: <BgColorsOutlined />,
      onClick: () => {
        setIsColorPickerOpened(true);
      },
    },
    ...(imageWithoutBackgroundUrl
      ? [
          {
            key: '2',
            label: t`Save`,
            icon: <DownloadOutlined />,
            onClick: handleSaveClick,
          },
        ]
      : []),
  ];

  const imageStyle: CSSProperties = {
    maxWidth: '100%',
    maxHeight: `calc(100dvh - 145px)`,
    objectFit: 'contain',
  };

  return (
    <Spin
      spinning={isLoading}
      tip={backgroundRemovalLoadingTip}
      indicator={<LoadingOutlined spin />}
      size="large"
    >
      <Flex vertical gap="small" style={{marginBottom: 8, padding: '0 16px'}}>
        <Typography.Text strong>
          <Trans>Select a photo to remove the background from</Trans>
        </Typography.Text>
        <Form.Item
          style={{margin: 0}}
          extra={
            !user &&
            (!isAccessAllowed ? (
              <Typography.Text type="warning">
                <Trans>
                  You&apos;ve selected mode that is available to paid Patreon members only
                </Trans>
              </Typography.Text>
            ) : (
              <Typography.Text type="secondary">
                <Trans>Only a limited number of modes are available in the free version</Trans>
              </Typography.Text>
            ))
          }
        >
          <Space align="start" style={{display: 'flex'}}>
            {isAccessAllowed && (
              <FileSelect onChange={handleFileChange} useReferencePhoto>
                <Trans>Select photo</Trans>
              </FileSelect>
            )}
            <Form.Item
              label={screens.sm ? t`Mode` : null}
              style={{margin: 0}}
              validateStatus={!isAccessAllowed ? 'warning' : undefined}
            >
              <OnnxModelSelect
                models={models}
                value={modelId}
                onChange={handleModelChange}
                style={{width: 105}}
              />
            </Form.Item>
            {screens.sm ? (
              <>
                <Form.Item label={t`Background`} style={{marginBottom: 0}}>
                  <ColorPicker
                    disabledAlpha
                    allowClear
                    onClear={() => {
                      setBackgroundRemovalColor(null);
                    }}
                    value={backgroundRemovalColor}
                    onChangeComplete={(color: Color) => {
                      setBackgroundRemovalColor(color.toHexString());
                    }}
                  />
                </Form.Item>
                {imageWithoutBackgroundUrl && (
                  <Button icon={<DownloadOutlined />} onClick={handleSaveClick}>
                    <Trans>Save</Trans>
                  </Button>
                )}
              </>
            ) : (
              <ColorPicker
                open={isColorPickerOpened}
                onOpenChange={(open: boolean) => {
                  if (!open) {
                    setIsColorPickerOpened(open);
                  }
                }}
                disabledAlpha
                allowClear
                onClear={() => {
                  setBackgroundRemovalColor(null);
                }}
                value={backgroundRemovalColor}
                onChangeComplete={(color: Color) => {
                  setBackgroundRemovalColor(color.toHexString());
                }}
              >
                <Dropdown menu={{items}}>
                  <Button icon={<MoreOutlined />} />
                </Dropdown>
              </ColorPicker>
            )}
          </Space>
        </Form.Item>
      </Flex>

      <ReactCompareSlider
        position={position}
        itemOne={
          imageUrl && (
            <ReactCompareSliderImage src={imageUrl} alt={t`Original photo`} style={imageStyle} />
          )
        }
        itemTwo={
          imageWithoutBackgroundUrl && (
            <ReactCompareSliderImage
              src={imageWithoutBackgroundUrl}
              alt={t`Image without background`}
              style={{backgroundColor: '#fff', ...imageStyle}}
            />
          )
        }
      />
    </Spin>
  );
};
