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

import {DownloadOutlined, MoreOutlined} from '@ant-design/icons';
import type {MenuProps} from 'antd';
import {App, Button, Dropdown, Flex, Form, Grid, Space, Spin, Typography} from 'antd';
import {saveAs} from 'file-saver';
import type {ChangeEvent, CSSProperties} from 'react';
import {useEffect, useState} from 'react';
import {ReactCompareSlider, ReactCompareSliderImage} from 'react-compare-slider';

import {FileSelect} from '~/src/components/image/FileSelect';
import {OnnxModelSelect} from '~/src/components/ml-model/OnnxModelSelect';
import {useAuth} from '~/src/hooks/useAuth';
import {useCreateObjectUrl} from '~/src/hooks/useCreateObjectUrl';
import {useOnnxModels} from '~/src/hooks/useOnnxModels';
import {hasAccessTo} from '~/src/services/auth/utils';
import {saveAppSettings} from '~/src/services/db/app-settings-db';
import {removeBackground} from '~/src/services/image/background-removal';
import {compareOnnxModelsByPriority} from '~/src/services/ml/models';
import type {OnnxModel} from '~/src/services/ml/types';
import {OnnxModelType} from '~/src/services/ml/types';
import {useAppStore} from '~/src/stores/app-store';
import {getFilename} from '~/src/utils/filename';

export const ImageBackgroundRemove: React.FC = () => {
  const appSettings = useAppStore(state => state.appSettings);
  const imageToRemoveBg = useAppStore(state => state.imageToRemoveBg);

  const setImageToRemoveBg = useAppStore(state => state.setImageToRemoveBg);

  const screens = Grid.useBreakpoint();

  const {notification} = App.useApp();

  const {user, isLoading: isAuthLoading} = useAuth();

  const {
    models,
    isLoading: isModelsLoading,
    isError: isModelsError,
  } = useOnnxModels(OnnxModelType.BackgroundRemoval);

  const [modelId, setModelId] = useState<string>();
  const [noBgBlob, setNoBgBlob] = useState<Blob>();
  const [position, setPosition] = useState<number>(100);

  const [isBackgroundRemovalLoading, setIsBackgroundRemovalLoading] = useState<boolean>(false);
  const [loadingPercent, setLoadingPercent] = useState<number | 'auto'>('auto');
  const [loadingTip, setLoadingTip] = useState<string>();

  const model: OnnxModel | null | undefined = modelId ? models?.get(modelId) : null;

  const isAccessAllowed: boolean = !model || (!isAuthLoading && hasAccessTo(user, model));

  const isLoading = isModelsLoading || isBackgroundRemovalLoading || isAuthLoading;

  const imageUrl: string | undefined = useCreateObjectUrl(imageToRemoveBg);
  const noBgImageUrl: string | undefined = useCreateObjectUrl(noBgBlob);

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
    const {backgroundRemovalModel} = appSettings;
    setModelId(
      backgroundRemovalModel ??
        [...(models?.values() ?? [])].sort(compareOnnxModelsByPriority)[0]?.id
    );
  }, [appSettings, models]);

  useEffect(() => {
    void (async () => {
      if (!imageToRemoveBg || !model || !hasAccessTo(user, model)) {
        return;
      }

      try {
        setIsBackgroundRemovalLoading(true);
        setLoadingPercent(0);
        setLoadingTip('Loading');
        setNoBgBlob(undefined);

        setPosition(100);

        setNoBgBlob(
          await removeBackground(imageToRemoveBg, model, (filename, progress) => {
            setLoadingPercent(progress);
            setLoadingTip(filename);
          })
        );
        setPosition(25);
      } finally {
        setIsBackgroundRemovalLoading(false);
      }
    })();
  }, [imageToRemoveBg, model, user]);

  const handleModelChange = (value: string) => {
    setModelId(value);
    void saveAppSettings({backgroundRemovalModel: value});
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file: File | null = e.target.files?.[0] ?? null;
    setImageToRemoveBg(file);
  };

  const handleSaveClick = () => {
    if (noBgImageUrl) {
      saveAs(noBgImageUrl, getFilename(imageToRemoveBg, 'no-bg', 'png'));
    }
  };

  const items: MenuProps['items'] = [
    {
      key: '1',
      label: 'Save',
      icon: <DownloadOutlined />,
      onClick: handleSaveClick,
    },
  ];

  const imageStyle: CSSProperties = {
    maxWidth: '100%',
    maxHeight: `calc(100vh - 145px)`,
    objectFit: 'contain',
  };

  return (
    <Spin spinning={isLoading} percent={loadingPercent} tip={loadingTip} size="large">
      <Flex vertical gap="small" style={{marginBottom: 8, padding: '0 16px'}}>
        <Typography.Text strong>Select a photo to remove the background from</Typography.Text>
        <Form.Item
          style={{margin: 0}}
          extra={
            !user &&
            (!isAccessAllowed ? (
              <Typography.Text type="warning">
                You&apos;ve selected mode that is available to paid Patreon members only.
              </Typography.Text>
            ) : (
              <Typography.Text type="secondary">
                Only a limited number of modes are available in the free version.
              </Typography.Text>
            ))
          }
        >
          <Space align="start" style={{display: 'flex'}}>
            <Form.Item
              label="Mode"
              style={{margin: 0}}
              validateStatus={!isAccessAllowed ? 'warning' : undefined}
            >
              <OnnxModelSelect
                models={models}
                value={modelId}
                onChange={handleModelChange}
                style={{width: 100}}
              />
            </Form.Item>
            {!isAuthLoading && isAccessAllowed && (
              <FileSelect onChange={handleFileChange}>Select photo</FileSelect>
            )}
            {noBgImageUrl &&
              (screens.sm ? (
                <Button icon={<DownloadOutlined />} onClick={handleSaveClick}>
                  Save
                </Button>
              ) : (
                <Dropdown menu={{items}}>
                  <Button icon={<MoreOutlined />} />
                </Dropdown>
              ))}
          </Space>
        </Form.Item>
      </Flex>

      <ReactCompareSlider
        position={position}
        itemOne={
          imageUrl && (
            <ReactCompareSliderImage src={imageUrl} alt="Original photo" style={imageStyle} />
          )
        }
        itemTwo={
          noBgImageUrl && (
            <ReactCompareSliderImage
              src={noBgImageUrl}
              alt="Image without background"
              style={{backgroundColor: '#fff', ...imageStyle}}
            />
          )
        }
      />
    </Spin>
  );
};
