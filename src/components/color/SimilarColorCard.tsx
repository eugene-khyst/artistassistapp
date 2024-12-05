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

import {BgColorsOutlined, LineChartOutlined} from '@ant-design/icons';
import {Button, Card, Space, Typography} from 'antd';

import {AddToPaletteButton} from '~/src/components/color/AddToPaletteButton';
import {ColorSquare} from '~/src/components/color/ColorSquare';
import type {ColorMixture, SimilarColor} from '~/src/services/color';
import {useAppStore} from '~/src/stores/app-store';

import {ColorMixtureDescription} from './ColorMixtureDescription';

interface Props {
  targetColor: string;
  similarColor: SimilarColor;
  onReflectanceChartClick: (colorMixture?: ColorMixture) => void;
}

export const SimilarColorCard: React.FC<Props> = ({
  targetColor,
  similarColor: {colorMixture, similarity},
  onReflectanceChartClick,
}: Props) => {
  const setBackgroundColor = useAppStore(state => state.setBackgroundColor);

  return (
    <Card size="small">
      <Space direction="vertical" style={{width: '100%'}}>
        <Space>
          <Typography.Text>
            <Typography.Text strong>{similarity.toFixed(1)}%</Typography.Text> similarity
          </Typography.Text>
          <ColorSquare size="small" color={targetColor} />
          <ColorSquare size="small" color={colorMixture.layerRgb} />
        </Space>
        <ColorMixtureDescription colorMixture={colorMixture} />
        <Space wrap>
          <AddToPaletteButton size="small" colorMixture={colorMixture} />
          <Button
            size="small"
            icon={<BgColorsOutlined />}
            title="Set the color of the base layer for the glazing"
            onClick={() => {
              void setBackgroundColor(colorMixture.layerRgb);
            }}
          >
            Set as background
          </Button>
          <Button
            size="small"
            icon={<LineChartOutlined />}
            title="Spectral reflectance curve"
            onClick={() => {
              onReflectanceChartClick(colorMixture);
            }}
          >
            Reflectance
          </Button>
        </Space>
      </Space>
    </Card>
  );
};
