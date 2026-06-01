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

import {
  DownloadOutlined,
  DownOutlined,
  MoreOutlined,
  PictureOutlined,
  StopOutlined,
} from '@ant-design/icons';
import {Trans, useLingui} from '@lingui/react/macro';
import type {CheckboxOptionType, MenuProps, RadioChangeEvent} from 'antd';
import {Button, Dropdown, Form, Grid, Radio, Space} from 'antd';
import {saveAs} from 'file-saver';
import {useEffect, useState} from 'react';

import {LoadingIndicator} from '@/components/loading/LoadingIndicator';
import {useZoomableImageCanvas, zoomableImageCanvasSupplier} from '@/hooks/useZoomableImageCanvas';
import type {ZoomableImageCanvas} from '@/services/canvas/image/zoomable-image-canvas';
import {blobToImageFile} from '@/services/image/image-file';
import {useAppStore} from '@/stores/app-store';
import {getFilename} from '@/utils/filename';
import {imageBitmapToBlob} from '@/utils/graphics';

import {EmptyImage} from './empty/EmptyImage';
import styles from './ImageBlurred.module.css';

const DEFAULT_IMAGE_INDEX = 1;

const FILENAME_SUFFIX = 'simplified';

const blurStrengthShortOptions: CheckboxOptionType<number>[] = [
  {value: 0, label: <StopOutlined />},
  {value: 1, label: 'S'},
  {value: 2, label: 'M'},
  {value: 3, label: 'L'},
  {value: 4, label: 'XL'},
];

export function ImageBlurred() {
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

  const [blurredImageIndex, setBlurredImageIndex] = useState<number>(DEFAULT_IMAGE_INDEX);

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
      key: 'set-as-reference',
      label: t`Set as reference`,
      icon: <PictureOutlined />,
      onClick: () => {
        void handleSetAsReferenceClick();
      },
    },
  ];

  if (!originalImage) {
    return <EmptyImage />;
  }

  const blurStrengthOptions: CheckboxOptionType<number>[] = [
    {value: 0, label: t`None`},
    {value: 1, label: t`Small`},
    {value: 2, label: t`Medium`},
    {value: 3, label: t`Large`},
    {value: 4, label: t`Max`},
  ];

  return (
    <LoadingIndicator loading={isBlurredImagesLoading}>
      <Space className="u-tab-toolbar">
        <Form.Item
          label={screens.sm ? t`Strength` : null}
          labelCol={{className: 'u-pb-0'}}
          tooltip={t`Adjusts the strength of image smoothing.`}
          className="u-mb-0"
        >
          <Radio.Group
            options={screens.sm ? blurStrengthOptions : blurStrengthShortOptions}
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
            <Dropdown menu={{items: imageItems}} trigger={['click']}>
              <Button icon={<DownOutlined />} />
            </Dropdown>
          </Space.Compact>
        ) : (
          <Dropdown
            trigger={['click']}
            menu={{
              items: [
                {
                  key: 'save',
                  label: t`Save`,
                  icon: <DownloadOutlined />,
                  onClick: () => {
                    void handleSaveClick();
                  },
                },
                ...imageItems,
              ],
            }}
          >
            <Button icon={<MoreOutlined />} />
          </Dropdown>
        )}
      </Space>
      <div>
        <canvas ref={canvasRef} className={styles['previewCanvas']} />
      </div>
    </LoadingIndicator>
  );
}
