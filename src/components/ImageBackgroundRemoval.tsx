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
import {Button, Divider, Dropdown, Flex, Form, Grid, Space, Typography} from 'antd';
import type {AggregationColor} from 'antd/es/color-picker/color';
import {clsx} from 'clsx';
import {saveAs} from 'file-saver';
import type {CSSProperties, ReactElement, ReactNode} from 'react';
import {cloneElement, useCallback, useMemo} from 'react';
import {ReactCompareSlider, ReactCompareSliderImage} from 'react-compare-slider';

import {ColorPicker} from '@/components/color/ColorPicker';
import {FileSelect} from '@/components/file/FileSelect';
import {LoadingIndicator} from '@/components/loading/LoadingIndicator';
import {OnnxModelSelect} from '@/components/ml-model/OnnxModelSelect';
import {useCreateObjectUrl} from '@/hooks/useCreateObjectUrl';
import {useDebounce} from '@/hooks/useDebounce';
import {useSelectedOnnxModel} from '@/hooks/useSelectedOnnxModel';
import {WHITE_HEX} from '@/services/color/space/rgb';
import {OnnxModelType} from '@/services/ml/types';
import {useAppStore} from '@/stores/app-store';
import {getFilename} from '@/utils/filename';

import styles from './ImageBackgroundRemoval.module.css';

const menuStyle: CSSProperties = {boxShadow: 'none'};
const compareImageStyle: CSSProperties = {objectFit: 'contain'};

export function ImageBackgroundRemoval() {
  const user = useAppStore(state => state.auth?.user);
  const isAuthLoading = useAppStore(state => state.isAuthLoading);
  const imageFileToRemoveBackground = useAppStore(state => state.imageFileToRemoveBackground);
  const backgroundRemovalColor = useAppStore(state => state.backgroundRemovalColor);
  const isBackgroundRemovalLoading = useAppStore(state => state.isBackgroundRemovalLoading);
  const backgroundRemovalDownloadTip = useAppStore(state => state.backgroundRemovalDownloadTip);
  const imageWithoutBackgroundBlob = useAppStore(state => state.imageWithoutBackgroundBlob);

  const setImageFileToRemoveBackground = useAppStore(state => state.setImageFileToRemoveBackground);
  const setBackgroundRemovalModel = useAppStore(state => state.setBackgroundRemovalModel);
  const setBackgroundRemovalColor = useAppStore(state => state.setBackgroundRemovalColor);
  const abortBackgroundRemoval = useAppStore(state => state.abortBackgroundRemoval);

  const screens = Grid.useBreakpoint();

  const {t} = useLingui();

  const {
    models,
    modelId,
    defaultModel,
    isAccessAllowed,
    isModelsLoading,
    selectModel,
    setSelectedModelId,
  } = useSelectedOnnxModel({
    type: OnnxModelType.BackgroundRemoval,
    settingsKey: 'backgroundRemovalModel',
    setModel: setBackgroundRemovalModel,
  });

  const isLoading: boolean = isModelsLoading || isBackgroundRemovalLoading || isAuthLoading;

  const imageUrl: string | undefined = useCreateObjectUrl(imageFileToRemoveBackground);
  const imageWithoutBackgroundUrl: string | undefined = useCreateObjectUrl(
    imageWithoutBackgroundBlob
  );

  const isBackgroundRemovalLoadingDebounced = useDebounce(isBackgroundRemovalLoading, 100);

  const position = isBackgroundRemovalLoadingDebounced ? 100 : 25;

  const handleFileChange = ([file]: File[]) => {
    setImageFileToRemoveBackground(file ?? null);
    if (!modelId) {
      setSelectedModelId(defaultModel?.id);
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
          className="u-mb-0"
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
              <FileSelect onChange={handleFileChange} showUseReferencePhoto showUseCopiedImage>
                <Trans>Select photo</Trans>
              </FileSelect>
            )}
            <Form.Item
              label={screens.sm ? t`Mode` : null}
              className="u-mb-0"
              validateStatus={!isAccessAllowed ? 'warning' : undefined}
            >
              <OnnxModelSelect
                models={models}
                value={modelId}
                onChange={selectModel}
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
