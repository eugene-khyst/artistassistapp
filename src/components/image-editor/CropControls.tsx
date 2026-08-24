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
import {Button, Flex, Form, Select} from 'antd';
import {useEffect} from 'react';

import {
  type CropAspectRatio,
  type ImageCroppingMode,
  ORIGINAL_CROP_ASPECT_RATIO,
} from '@/services/canvas/mode/image-cropping-mode';
import {useAppStore} from '@/stores/app-store';

enum CropAspectRatioOption {
  Free = 'free',
  Original = 'original',
  Ratio1To1 = '1:1',
  Ratio4To5 = '4:5',
  Ratio5To4 = '5:4',
  Ratio3To4 = '3:4',
  Ratio4To3 = '4:3',
  Ratio2To3 = '2:3',
  Ratio3To2 = '3:2',
  Ratio9To16 = '9:16',
  Ratio16To9 = '16:9',
}

const CROP_ASPECT_RATIOS: Record<CropAspectRatioOption, CropAspectRatio> = {
  [CropAspectRatioOption.Free]: null,
  [CropAspectRatioOption.Original]: ORIGINAL_CROP_ASPECT_RATIO,
  [CropAspectRatioOption.Ratio1To1]: [1, 1],
  [CropAspectRatioOption.Ratio4To5]: [4, 5],
  [CropAspectRatioOption.Ratio5To4]: [5, 4],
  [CropAspectRatioOption.Ratio3To4]: [3, 4],
  [CropAspectRatioOption.Ratio4To3]: [4, 3],
  [CropAspectRatioOption.Ratio2To3]: [2, 3],
  [CropAspectRatioOption.Ratio3To2]: [3, 2],
  [CropAspectRatioOption.Ratio9To16]: [9, 16],
  [CropAspectRatioOption.Ratio16To9]: [16, 9],
};

function cropAspectRatioOption(aspectRatio: CropAspectRatio): CropAspectRatioOption {
  if (!aspectRatio) {
    return CropAspectRatioOption.Free;
  }
  return aspectRatio === ORIGINAL_CROP_ASPECT_RATIO
    ? CropAspectRatioOption.Original
    : (aspectRatio.join(':') as CropAspectRatioOption);
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

  const handleAspectRatioChange = (option: CropAspectRatioOption) => {
    setCropAspectRatio(CROP_ASPECT_RATIOS[option]);
  };

  return (
    <Flex vertical gap="small">
      <Form.Item label={<Trans>Aspect ratio</Trans>} className="u-mb-0">
        <Select
          className="u-w-100"
          value={cropAspectRatioOption(cropAspectRatio)}
          options={[
            {value: CropAspectRatioOption.Free, label: <Trans>Free</Trans>},
            {value: CropAspectRatioOption.Original, label: <Trans>Original</Trans>},
            {value: CropAspectRatioOption.Ratio1To1, label: '1:1'},
            {value: CropAspectRatioOption.Ratio4To5, label: '4:5'},
            {value: CropAspectRatioOption.Ratio5To4, label: '5:4'},
            {value: CropAspectRatioOption.Ratio3To4, label: '3:4'},
            {value: CropAspectRatioOption.Ratio4To3, label: '4:3'},
            {value: CropAspectRatioOption.Ratio2To3, label: '2:3'},
            {value: CropAspectRatioOption.Ratio3To2, label: '3:2'},
            {value: CropAspectRatioOption.Ratio9To16, label: '9:16'},
            {value: CropAspectRatioOption.Ratio16To9, label: '16:9'},
          ]}
          onChange={handleAspectRatioChange}
        />
      </Form.Item>
      <Button
        type="primary"
        icon={<CheckOutlined />}
        className="u-w-fit"
        disabled={!editedImage || !croppingMode}
        onClick={() => {
          if (croppingMode) {
            cropImage(croppingMode.getCropRectangle());
          }
        }}
      >
        <Trans>Crop</Trans>
      </Button>
    </Flex>
  );
}
