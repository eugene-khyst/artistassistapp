/**
 * ArtistAssistApp
 * Copyright (C) 2023-2024  Eugene Khyst
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

import {DownloadOutlined, LoadingOutlined, MoreOutlined} from '@ant-design/icons';
import type {CheckboxOptionType, MenuProps, RadioChangeEvent} from 'antd';
import {Button, Dropdown, Form, Grid, Radio, Space, Spin} from 'antd';
import {useEffect, useState} from 'react';

import {useZoomableImageCanvas, zoomableImageCanvasSupplier} from '~/src/hooks';
import type {ZoomableImageCanvas} from '~/src/services/canvas/image';
import {useAppStore} from '~/src/stores/app-store';

import {EmptyImage} from './empty/EmptyImage';

const MEDIAN_FILTER_RADIUS_OPTIONS: CheckboxOptionType<number>[] = [
  {value: 0, label: 'None'},
  {value: 1, label: 'Small'},
  {value: 2, label: 'Medium'},
  {value: 3, label: 'Large'},
];

const MEDIAN_FILTER_RADIUS_OPTIONS_SHORT: CheckboxOptionType<number>[] = [
  {value: 0, label: 'No'},
  {value: 1, label: 'S'},
  {value: 2, label: 'M'},
  {value: 3, label: 'L'},
];

const DEFAULT_BLURRED_IMAGE_INDEX = 1;

export const ImageBlurred: React.FC = () => {
  const originalImage = useAppStore(state => state.originalImage);
  const blurredImages = useAppStore(state => state.blurredImages);

  const isBlurredImagesLoading = useAppStore(state => state.isBlurredImagesLoading);

  const screens = Grid.useBreakpoint();

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

  const items: MenuProps['items'] = [
    {
      key: '1',
      label: 'Save',
      icon: <DownloadOutlined />,
      onClick: () => void zoomableImageCanvas?.saveAsImage('ArtistAssistApp-Simplified'),
    },
  ];

  if (!originalImage) {
    return <EmptyImage feature="view a smoothed reference photo" />;
  }

  return (
    <Spin
      spinning={isBlurredImagesLoading}
      tip="Loading"
      indicator={<LoadingOutlined spin />}
      size="large"
    >
      <Space
        size="small"
        align="start"
        style={{width: '100%', justifyContent: 'center', marginBottom: 8}}
      >
        <Form.Item
          label="Blur"
          tooltip="Controls the radius of the median filter."
          style={{marginBottom: 0}}
        >
          <Radio.Group
            options={screens.sm ? MEDIAN_FILTER_RADIUS_OPTIONS : MEDIAN_FILTER_RADIUS_OPTIONS_SHORT}
            value={blurredImageIndex}
            onChange={handleBlurChange}
            optionType="button"
            buttonStyle="solid"
          />
        </Form.Item>
        <Dropdown menu={{items}}>
          <Button icon={<MoreOutlined />} />
        </Dropdown>
      </Space>
      <div>
        <canvas ref={canvasRef} style={{width: '100%', height: `calc(100vh - 115px)`}} />
      </div>
    </Spin>
  );
};
