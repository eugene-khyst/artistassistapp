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

import {BgColorsOutlined, MoreOutlined, QuestionCircleOutlined} from '@ant-design/icons';
import type {MenuProps} from 'antd';
import {Button, Card, Dropdown, Popover, Space, theme, Typography} from 'antd';

import {AddToPaletteButton} from '~/src/components/color/AddToPaletteButton';
import type {SimilarColor} from '~/src/services/color';
import {useAppStore} from '~/src/stores/app-store';

import {ColorMixtureDescription} from './ColorMixtureDescription';

const popoverContent = (
  <ul>
    <li>&lt;=1 - Not perceptible by human eyes</li>
    <li>1-2 - Perceptible through close observation</li>
    <li>2-10 - Perceptible at a glance</li>
    <li>10-49 - Colors are more similar than opposite</li>
    <li>&gt;=100 - Colors are exact opposite</li>
  </ul>
);

interface Props {
  similarColor: SimilarColor;
}

export const SimilarColorCard: React.FC<Props> = ({
  similarColor: {colorMixture, deltaE},
}: Props) => {
  const setBackgroundColor = useAppStore(state => state.setBackgroundColor);

  const {
    token: {colorTextTertiary},
  } = theme.useToken();

  const items: MenuProps['items'] = [
    {
      label: 'Set as background',
      key: '1',
      icon: <BgColorsOutlined />,
      onClick: () => void setBackgroundColor(colorMixture.layerRgb),
    },
  ];

  return (
    <Card size="small">
      <Space direction="vertical" size="small" style={{width: '100%'}}>
        <ColorMixtureDescription colorMixture={colorMixture} />
        <Space size="small" style={{width: '100%', justifyContent: 'space-between'}}>
          <Space size="small" align="center">
            <Typography.Text strong>{`ΔE: ${deltaE.toFixed(1)}`}</Typography.Text>
            <Popover title="Color difference" content={popoverContent}>
              <QuestionCircleOutlined style={{color: colorTextTertiary, cursor: 'help'}} />
            </Popover>
          </Space>
          <Space.Compact block>
            <AddToPaletteButton colorMixture={colorMixture} />
            <Dropdown menu={{items}}>
              <Button icon={<MoreOutlined />} />
            </Dropdown>
          </Space.Compact>
        </Space>
      </Space>
    </Card>
  );
};
