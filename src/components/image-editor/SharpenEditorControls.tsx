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

import {ThunderboltOutlined} from '@ant-design/icons';
import {range} from '@eugene-khyst/artistassistapp-color-mixer';
import {Trans} from '@lingui/react/macro';
import {Button, Form, Select, Slider, Space} from 'antd';
import {type DefaultOptionType as SelectOptionType} from 'antd/es/select';
import type {SliderMarks} from 'antd/es/slider';
import {type ReactNode} from 'react';

import {
  SHARPEN_MODES,
  SHARPEN_STRENGTH_MAX,
  SHARPEN_STRENGTH_MIN,
  SharpenMode,
} from '@/services/image/sharpen-controls';
import {useAppStore} from '@/stores/app-store';

const MODES: Record<SharpenMode, {label: ReactNode}> = {
  [SharpenMode.UnsharpMask]: {
    label: <Trans>Unsharp mask</Trans>,
  },
  [SharpenMode.HighPass]: {
    label: <Trans>High pass</Trans>,
  },
} as const;

const MODE_OPTIONS: SelectOptionType[] = SHARPEN_MODES.map(value => ({
  value,
  label: MODES[value].label,
}));

const STRENGTH_MARKS: SliderMarks = Object.fromEntries(
  range(SHARPEN_STRENGTH_MIN, SHARPEN_STRENGTH_MAX).map(value => [value, value])
);

export function SharpenEditorControls() {
  const sharpenControls = useAppStore(state => state.sharpenControls);
  const setSharpenControls = useAppStore(state => state.setSharpenControls);
  const sharpenImage = useAppStore(state => state.sharpenImage);

  const {mode, strength} = sharpenControls;

  return (
    <Space orientation="vertical" className="u-w-100">
      <Form.Item label={<Trans>Mode</Trans>} labelCol={{className: 'u-pb-0'}} className="u-mb-0">
        <Select<SharpenMode>
          options={MODE_OPTIONS}
          value={mode}
          onChange={mode => {
            setSharpenControls({mode});
          }}
        />
      </Form.Item>

      <Form.Item
        label={<Trans>Strength</Trans>}
        labelCol={{className: 'u-pb-0'}}
        className="u-mb-0"
      >
        <Slider
          value={strength}
          min={SHARPEN_STRENGTH_MIN}
          max={SHARPEN_STRENGTH_MAX}
          marks={STRENGTH_MARKS}
          onChange={strength => {
            setSharpenControls({strength});
          }}
        />
      </Form.Item>

      <Button
        type="primary"
        icon={<ThunderboltOutlined />}
        onClick={() => {
          void sharpenImage();
        }}
      >
        <Trans>Sharpen</Trans>
      </Button>
    </Space>
  );
}
