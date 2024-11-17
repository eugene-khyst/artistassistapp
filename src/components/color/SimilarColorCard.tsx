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

import {
  BgColorsOutlined,
  LineChartOutlined,
  MoreOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import type {MenuProps} from 'antd';
import {Button, Card, Dropdown, Space, theme, Tooltip, Typography} from 'antd';

import {AddToPaletteButton} from '~/src/components/color/AddToPaletteButton';
import type {ColorMixture, SimilarColor} from '~/src/services/color';
import {useAppStore} from '~/src/stores/app-store';

import {ColorMixtureDescription} from './ColorMixtureDescription';

interface Props {
  similarColor: SimilarColor;
  onReflectanceChartClick: (colorMixture?: ColorMixture) => void;
}

export const SimilarColorCard: React.FC<Props> = ({
  similarColor: {colorMixture, similarity},
  onReflectanceChartClick,
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
      onClick: () => {
        void setBackgroundColor(colorMixture.layerRgb);
      },
    },
    {
      label: 'Reflectance chart',
      key: '2',
      icon: <LineChartOutlined />,
      onClick: () => {
        onReflectanceChartClick(colorMixture);
      },
    },
  ];

  return (
    <Card size="small">
      <Space direction="vertical" style={{width: '100%'}}>
        <ColorMixtureDescription colorMixture={colorMixture} />
        <Space style={{width: '100%', justifyContent: 'space-between'}}>
          <Space align="center">
            <Typography.Text strong>{`≈ ${similarity.toFixed(1)}%`}</Typography.Text>
            <Tooltip title="Color similarity">
              <QuestionCircleOutlined style={{color: colorTextTertiary, cursor: 'help'}} />
            </Tooltip>
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
