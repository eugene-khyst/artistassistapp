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

import {
  DownloadOutlined,
  LoadingOutlined,
  MoreOutlined,
  PictureOutlined,
  StopOutlined,
} from '@ant-design/icons';
import {Trans, useLingui} from '@lingui/react/macro';
import type {CheckboxOptionType, MenuProps, RadioChangeEvent} from 'antd';
import {Button, Dropdown, Form, Grid, Radio, Space, Spin} from 'antd';
import {saveAs} from 'file-saver';
import {useEffect, useState} from 'react';

import {
  useZoomableImageCanvas,
  zoomableImageCanvasSupplier,
} from '~/src/hooks/useZoomableImageCanvas';
import type {ZoomableImageCanvas} from '~/src/services/canvas/image/zoomable-image-canvas';
import {blobToImageFile} from '~/src/services/image/image-file';
import {useAppStore} from '~/src/stores/app-store';
import {getFilename} from '~/src/utils/filename';
import {imageBitmapToBlob} from '~/src/utils/graphics';

import {EmptyImage} from './empty/EmptyImage';

const MEDIAN_FILTER_RADIUS_OPTIONS_SHORT: CheckboxOptionType<number>[] = [
  {value: 0, label: <StopOutlined />},
  {value: 1, label: 'S'},
  {value: 2, label: 'M'},
  {value: 3, label: 'L'},
];

const DEFAULT_BLURRED_IMAGE_INDEX = 1;

const FILENAME_SUFFIX = 'simplified';

export const ImageBlurred: React.FC = () => {
  const originalImageFile = useAppStore(state => state.originalImageFile);
  const originalImage = useAppStore(state => state.originalImage);
  const blurredImages = useAppStore(state => state.blurredImages);

  const isBlurredImagesLoading = useAppStore(state => state.isBlurredImagesLoading);

  const saveRecentImageFile = useAppStore(state => state.saveRecentImageFile);

  const screens = Grid.useBreakpoint();

  const {t} = useLingui();

  const {ref: canvasRef, zoomableImageCanvas} = useZoomableImageCanvas<ZoomableImageCanvas>(
    zoomableImageCanvasSupplier,
    blurredImages
  );

  const [blurredImageIndex, setBlurredImageIndex] = useState<number>(DEFAULT_BLURRED_IMAGE_INDEX);

  useEffect(() => {
    zoomableImageCanvas?.setImageIndex(blurredImageIndex);
  }, [zoomableImageCanvas, blurredImageIndex]);

  const handleBlurChange = (e: RadioChangeEvent) => {
    setBlurredImageIndex(e.target.value as number);
  };

  const handleSaveClick = async () => {
    const image: ImageBitmap | undefined = blurredImages[blurredImageIndex];
    if (!image) {
      return;
    }
    saveAs(await imageBitmapToBlob(image), getFilename(originalImageFile, FILENAME_SUFFIX));
  };

  const handleSetAsReferenceClick = async () => {
    const image: ImageBitmap | undefined = blurredImages[blurredImageIndex];
    if (!image) {
      return;
    }
    const blob: Blob = await imageBitmapToBlob(image);
    void saveRecentImageFile(
      await blobToImageFile(blob, getFilename(originalImageFile, FILENAME_SUFFIX))
    );
  };

  const imageItems: MenuProps['items'] = [
    {
      key: '2',
      label: t`Set as reference`,
      icon: <PictureOutlined />,
      onClick: () => {
        void handleSetAsReferenceClick();
      },
    },
  ];

  const items: MenuProps['items'] = [
    {
      key: '1',
      label: t`Save`,
      icon: <DownloadOutlined />,
      onClick: () => {
        void handleSaveClick();
      },
    },
    ...imageItems,
  ];

  if (!originalImage) {
    return <EmptyImage />;
  }

  return (
    <Spin spinning={isBlurredImagesLoading} indicator={<LoadingOutlined spin />} size="large">
      <Space align="start" style={{width: '100%', justifyContent: 'center', marginBottom: 8}}>
        <Form.Item
          label={t`Blur`}
          tooltip={t`Controls the radius of the median filter.`}
          style={{marginBottom: 0}}
        >
          <Radio.Group
            options={
              screens.sm
                ? [
                    {value: 0, label: t`None`},
                    {value: 1, label: t`Small`},
                    {value: 2, label: t`Medium`},
                    {value: 3, label: t`Large`},
                  ]
                : MEDIAN_FILTER_RADIUS_OPTIONS_SHORT
            }
            value={blurredImageIndex}
            onChange={handleBlurChange}
            optionType="button"
            buttonStyle="solid"
          />
        </Form.Item>
        {screens.sm ? (
          <Space.Compact>
            <Button
              icon={<DownloadOutlined />}
              onClick={() => {
                void handleSaveClick();
              }}
            >
              <Trans>Save</Trans>
            </Button>
            <Dropdown menu={{items: imageItems}}>
              <Button icon={<MoreOutlined />} />
            </Dropdown>
          </Space.Compact>
        ) : (
          <Dropdown menu={{items}}>
            <Button icon={<MoreOutlined />} />
          </Dropdown>
        )}
      </Space>
      <div>
        <canvas ref={canvasRef} style={{width: '100%', height: `calc(100dvh - 115px)`}} />
      </div>
    </Spin>
  );
};
