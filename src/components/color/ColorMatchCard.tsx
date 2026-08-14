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

import {LineChartOutlined} from '@ant-design/icons';
import {
  COLOR_MIXING,
  type ColorMatch,
  type ColorMixture,
  getColorId,
  isPastel,
  Layering,
  rgbToHex,
} from '@eugene-khyst/artistassistapp-color-mixer';
import {Trans, useLingui} from '@lingui/react/macro';
import {Button, Card, Col, Flex, Row, Space, Typography} from 'antd';
import {memo} from 'react';

import {AddToPaletteButton} from '@/components/color/AddToPaletteButton';
import {ColorSquare} from '@/components/color/ColorSquare';
import {useAppStore} from '@/stores/app-store';

import {ColorMixtureDescription} from './ColorMixtureDescription';

interface Props {
  targetColor: string;
  colorMatch: ColorMatch;
  onReflectanceChartClick: (colorMixture?: ColorMixture) => void;
}

export const ColorMatchCard = memo(function ColorMatchCard({
  targetColor,
  colorMatch: {colorMixture, matchScore, deltaEOk},
  onReflectanceChartClick,
}: Readonly<Props>) {
  const paletteColorMixture = useAppStore(state =>
    state.paletteColorMixtures.get(colorMixture.type)?.get(colorMixture.key)
  );

  const saveToPalette = useAppStore(state => state.saveToPalette);
  const setUnderlayer = useAppStore(state => state.setUnderlayer);
  const setMotherColor = useAppStore(state => state.setMotherColor);

  const {t} = useLingui();

  const {type} = colorMixture;
  const {mixing, layering} = COLOR_MIXING[type];
  const pastel: boolean = isPastel(type);

  const matchScoreText = matchScore.toFixed(1);
  const deltaEOkText = deltaEOk.toFixed(3);

  const handleTitleEdited = (value: string) => {
    if (paletteColorMixture) {
      void saveToPalette({
        colorMixture: {
          ...paletteColorMixture,
          name: value,
        },
        preserveDate: true,
      });
    }
  };

  const handleSetAsUnderlayerClick = () => {
    void setUnderlayer(rgbToHex(...colorMixture.layerRgb));
  };

  const handleSetAsMotherColorClick = () => {
    void setMotherColor(getColorId(colorMixture));
  };

  return (
    <Card size="small">
      <Flex vertical gap="small" className="u-w-100">
        <Flex gap="small">
          <Space size={4}>
            <ColorSquare size="small" hex={targetColor} />
            <ColorSquare size="small" hex={rgbToHex(...colorMixture.layerRgb)} />
          </Space>
          <Typography.Text>
            <Trans>
              <Typography.Text strong>{matchScoreText}%</Typography.Text> match score
            </Trans>
          </Typography.Text>
          <Typography.Text type="secondary">
            ΔE<sub>OK</sub>: {deltaEOkText}
          </Typography.Text>
        </Flex>
        <ColorMixtureDescription colorMixture={colorMixture} />
        {paletteColorMixture && (
          <Typography.Text
            editable={{
              text: paletteColorMixture.name ?? '',
              onChange: handleTitleEdited,
              autoSize: false,
            }}
            className="u-w-100 u-font-bold"
          >
            {paletteColorMixture.name || <Trans>Untitled mixture</Trans>}
          </Typography.Text>
        )}

        <Row gutter={8}>
          <Col xs={12}>
            <AddToPaletteButton block size="small" colorMixture={colorMixture} />
          </Col>
          <Col xs={12}>
            <Button
              block
              size="small"
              icon={<LineChartOutlined />}
              title={t`Spectral reflectance curve`}
              onClick={() => {
                onReflectanceChartClick(colorMixture);
              }}
            >
              <Trans>Reflectance</Trans>
            </Button>
          </Col>
        </Row>

        <Row gutter={8}>
          {layering !== Layering.None && (
            <Col xs={12}>
              <Button
                block
                size="small"
                title={
                  pastel ? t`Set as underlayer for blending.` : t`Set as underlayer for glazing.`
                }
                onClick={handleSetAsUnderlayerClick}
              >
                <Trans>Set as underlayer</Trans>
              </Button>
            </Col>
          )}
          {mixing && colorMixture.parts.length === 1 && (
            <Col xs={12}>
              <Button
                block
                size="small"
                title={t`Mix this color into every mixture.`}
                onClick={handleSetAsMotherColorClick}
              >
                <Trans>Set as unifying color</Trans>
              </Button>
            </Col>
          )}
        </Row>
      </Flex>
    </Card>
  );
});
