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

import {RotateRightOutlined} from '@ant-design/icons';
import {Trans} from '@lingui/react/macro';
import {Button, Form, Slider, Space} from 'antd';
import type {SliderMarks} from 'antd/es/slider';

import {useAppStore} from '@/stores/app-store';

const ROTATION_ANGLE_MIN = -45;
const ROTATION_ANGLE_MAX = 45;
const ROTATION_ANGLE_STEP = 0.5;

const rotationAngleSliderMarks: SliderMarks = Object.fromEntries(
  [ROTATION_ANGLE_MIN, 0, ROTATION_ANGLE_MAX].map((angle: number) => [angle, `${angle}°`])
);

export function RotateControls() {
  const rotateImageClockwise = useAppStore(state => state.rotateImageClockwise);
  const rotationAngle = useAppStore(state => state.rotationAngle);
  const setRotationAngle = useAppStore(state => state.setRotationAngle);
  const rotateImage = useAppStore(state => state.rotateImage);

  return (
    <Space orientation="vertical" className="u-w-100">
      <Form.Item
        layout="vertical"
        label={<Trans>Angle</Trans>}
        labelCol={{className: 'u-pb-0'}}
        className="u-mb-0"
      >
        <Slider
          value={rotationAngle}
          onChange={setRotationAngle}
          onChangeComplete={() => {
            void rotateImage();
          }}
          min={ROTATION_ANGLE_MIN}
          max={ROTATION_ANGLE_MAX}
          step={ROTATION_ANGLE_STEP}
          marks={rotationAngleSliderMarks}
        />
      </Form.Item>
      <Button
        icon={<RotateRightOutlined />}
        onClick={() => {
          void rotateImageClockwise();
        }}
      >
        <Trans>Rotate clockwise</Trans>
      </Button>
    </Space>
  );
}
