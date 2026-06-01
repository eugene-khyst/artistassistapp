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

import {CloseCircleOutlined, DownOutlined} from '@ant-design/icons';
import {useLingui} from '@lingui/react/macro';
import {Button, Dropdown, Form, Space} from 'antd';
import type {AggregationColor} from 'antd/es/color-picker/color';
import {useCallback, useMemo} from 'react';

import {ColorPicker} from '@/components/color/ColorPicker';
import {COLOR_PICKER_PRESET_LABELS} from '@/components/messages';
import {COLOR_MIXING, PAPER_WHITE_HEX} from '@/services/color/color-mixer';
import {isPastel} from '@/services/color/colors';
import {Layering} from '@/services/color/types';
import {useAppStore} from '@/stores/app-store';

interface Props {
  underlayerHex: string | null;
  setUnderlayerHex: (value: string | null) => void | Promise<void>;
  surfaceHex: string;
  setSurfaceHex: (value: string) => void | Promise<void>;
}

export function UnderlayerColorPicker({
  underlayerHex,
  setUnderlayerHex,
  surfaceHex,
  setSurfaceHex,
}: Readonly<Props>) {
  const colorType = useAppStore(state => state.colorSet?.type);

  const {t} = useLingui();

  const {layering = Layering.None} = colorType ? COLOR_MIXING[colorType] : {};
  const pastel: boolean = !!colorType && isPastel(colorType);

  const surfaceColorPicker = useMemo(
    () => (
      <Form.Item
        label={t`Surface color`}
        labelCol={{className: 'u-pb-0'}}
        tooltip={t`The color of your paper, canvas, or painting surface.`}
        className="u-mb-0"
      >
        <ColorPicker
          title={t`Surface color`}
          presets={[
            {
              label: t(COLOR_PICKER_PRESET_LABELS.PAPER_WHITE),
              colors: [PAPER_WHITE_HEX],
            },
          ]}
          showText={false}
          disabledAlpha
          value={surfaceHex}
          onChangeComplete={(color: AggregationColor) => {
            void setSurfaceHex(color.toHexString());
          }}
          classNames={{popup: {root: 'color-picker-high-z-index'}}}
        />
      </Form.Item>
    ),
    [t, surfaceHex, setSurfaceHex]
  );

  const popupRender = useCallback(
    () => (
      <div className="u-popup-panel">
        <div className="u-popup-content">{surfaceColorPicker}</div>
      </div>
    ),
    [surfaceColorPicker]
  );

  if (layering === Layering.None) {
    return surfaceColorPicker;
  }

  return (
    <Form.Item
      label={t`Underlayer`}
      labelCol={{className: 'u-pb-0'}}
      tooltip={
        pastel
          ? t`The existing pastel layer you want to blend over.`
          : t`The dried layer you want to glaze over.`
      }
      className="u-mb-0"
    >
      <Space.Compact>
        <ColorPicker
          title={t`Underlayer`}
          showText={false}
          disabledAlpha
          value={underlayerHex}
          onChangeComplete={(color: AggregationColor) => {
            void setUnderlayerHex(color.toHexString());
          }}
          classNames={{popup: {root: 'color-picker-high-z-index'}}}
        />
        <Button
          icon={<CloseCircleOutlined />}
          title={t`Clear underlayer`}
          onClick={() => {
            void setUnderlayerHex(null);
          }}
        />
        <Dropdown trigger={['click']} popupRender={popupRender}>
          <Button icon={<DownOutlined />} />
        </Dropdown>
      </Space.Compact>
    </Form.Item>
  );
}
