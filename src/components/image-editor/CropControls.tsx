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

import {CheckOutlined} from '@ant-design/icons';
import {Trans} from '@lingui/react/macro';
import {Button, Form, Select, Space} from 'antd';
import {useEffect} from 'react';

import {type ImageCroppingMode} from '@/services/canvas/mode/image-cropping-mode';
import {
  type CropAspectRatio,
  IMAGE_ASPECT_RATIO_OPTIONS,
  imageAspectRatio,
  imageAspectRatioLabel,
  ORIGINAL_CROP_ASPECT_RATIO,
} from '@/services/image/aspect-ratio';
import {useAppStore} from '@/stores/app-store';

const FREE_CROP_ASPECT_RATIO_OPTION = 'free';

const CROP_ASPECT_RATIO_OPTIONS = [
  {value: FREE_CROP_ASPECT_RATIO_OPTION, label: <Trans>Free</Trans>},
  {value: ORIGINAL_CROP_ASPECT_RATIO, label: <Trans>Original</Trans>},
  ...IMAGE_ASPECT_RATIO_OPTIONS,
];

function cropAspectRatioOption(aspectRatio: CropAspectRatio): string {
  if (!aspectRatio) {
    return FREE_CROP_ASPECT_RATIO_OPTION;
  }
  return typeof aspectRatio === 'string' ? aspectRatio : imageAspectRatioLabel(aspectRatio);
}

function cropAspectRatioFromOption(option: string): CropAspectRatio {
  return option === ORIGINAL_CROP_ASPECT_RATIO
    ? ORIGINAL_CROP_ASPECT_RATIO
    : (imageAspectRatio(option) ?? null);
}

interface Props {
  croppingMode: ImageCroppingMode | null;
}

export function CropControls({croppingMode}: Readonly<Props>) {
  const editedImage = useAppStore(state => state.editedImage);
  const cropAspectRatio = useAppStore(state => state.cropAspectRatio);
  const setCropAspectRatio = useAppStore(state => state.setCropAspectRatio);
  const cropImage = useAppStore(state => state.cropImage);

  useEffect(() => {
    croppingMode?.setAspectRatio(cropAspectRatio);
  }, [cropAspectRatio, croppingMode]);

  const handleAspectRatioChange = (option: string) => {
    setCropAspectRatio(cropAspectRatioFromOption(option));
  };

  return (
    <Space orientation="vertical">
      <Form.Item
        label={<Trans>Aspect ratio</Trans>}
        labelCol={{className: 'u-pb-0'}}
        className="u-mb-0"
      >
        <Select
          className="u-narrow-select"
          value={cropAspectRatioOption(cropAspectRatio)}
          options={CROP_ASPECT_RATIO_OPTIONS}
          onChange={handleAspectRatioChange}
          popupMatchSelectWidth={false}
        />
      </Form.Item>
      <Button
        type="primary"
        icon={<CheckOutlined />}
        disabled={!editedImage || !croppingMode}
        onClick={() => {
          if (croppingMode) {
            cropImage(croppingMode.getCropRectangle());
          }
        }}
      >
        <Trans>Crop</Trans>
      </Button>
    </Space>
  );
}
