/**
 * ArtistAssistApp
 * Copyright (C) 2023-2025  Eugene Khyst
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
import {Trans, useLingui} from '@lingui/react/macro';
import {Button, Card, Space, Typography} from 'antd';

import {AddToPaletteButton} from '~/src/components/color/AddToPaletteButton';
import {ColorSquare} from '~/src/components/color/ColorSquare';
import {COLOR_MIXING} from '~/src/services/color/color-mixer';
import {rgbToHex} from '~/src/services/color/space/rgb';
import type {ColorMixture, SimilarColor} from '~/src/services/color/types';
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
  const paletteColorMixtures = useAppStore(state => state.paletteColorMixtures);

  const saveToPalette = useAppStore(state => state.saveToPalette);
  const setBackgroundColor = useAppStore(state => state.setBackgroundColor);

  const {t} = useLingui();

  const {type} = colorMixture;
  const {glazing} = COLOR_MIXING[type];

  const paletteColorMixture: ColorMixture | undefined = paletteColorMixtures.get(colorMixture.key);
  const similarityText: string = similarity.toFixed(1);

  const handleTitleEdited = (value: string) => {
    if (paletteColorMixture) {
      void saveToPalette({...paletteColorMixture, name: value});
    }
  };

  return (
    <Card size="small">
      <Space direction="vertical" style={{width: '100%'}}>
        <Space>
          <Typography.Text>
            <Trans>
              <Typography.Text strong>{similarityText}%</Typography.Text> similarity
            </Trans>
          </Typography.Text>
          <ColorSquare size="small" color={targetColor} />
          <ColorSquare size="small" color={rgbToHex(...colorMixture.layerRgb)} />
        </Space>
        <ColorMixtureDescription colorMixture={colorMixture} />
        {paletteColorMixture && (
          <Typography.Text
            editable={{
              text: paletteColorMixture.name ?? '',
              onChange: handleTitleEdited,
              autoSize: false,
            }}
            style={{width: '100%', fontWeight: 'bold'}}
          >
            {paletteColorMixture.name || t`Untitled mixture`}
          </Typography.Text>
        )}
        <Space wrap>
          <AddToPaletteButton size="small" colorMixture={colorMixture} />
          {glazing && (
            <Button
              size="small"
              icon={<BgColorsOutlined />}
              title={t`Set the color of the base layer for the glazing`}
              onClick={() => {
                void setBackgroundColor(rgbToHex(...colorMixture.layerRgb));
              }}
            >
              <Trans>Set as background</Trans>
            </Button>
          )}
          <Button
            size="small"
            icon={<LineChartOutlined />}
            title={t`Spectral reflectance curve`}
            onClick={() => {
              onReflectanceChartClick(colorMixture);
            }}
          >
            <Trans>Reflectance</Trans>
          </Button>
        </Space>
      </Space>
    </Card>
  );
};
