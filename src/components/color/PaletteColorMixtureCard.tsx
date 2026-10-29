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

import {CameraOutlined, DeleteOutlined, PictureOutlined} from '@ant-design/icons';
import {
  COLOR_MIXING,
  type ColorMixture,
  getColorId,
  isPastel,
  Layering,
  rgbToHex,
} from '@eugene-khyst/artistassistapp-color-mixer';
import {Trans, useLingui} from '@lingui/react/macro';
import {Button, Card, Col, Flex, Popconfirm, Row, Typography} from 'antd';
import type {CardProps} from 'antd/lib';
import {memo, useState} from 'react';

import {ColorMixtureDescription} from '@/components/color/ColorMixtureDescription';
import {TonalValueTag} from '@/components/tonal-value/TonalValueTag';
import {useAppStore} from '@/stores/app-store';
import {TabKey} from '@/tabs';

import {CompareMixtureDrawer} from './CompareMixtureDrawer';

type Props = {
  colorMixture: ColorMixture;
  showOnPhoto?: boolean;
} & Pick<CardProps, 'style' | 'className'>;

export const PaletteColorMixtureCard = memo(function PaletteColorMixtureCard({
  colorMixture,
  showOnPhoto = true,
  ...props
}: Readonly<Props>) {
  const saveToPalette = useAppStore(state => state.saveToPalette);
  const deleteFromPalette = useAppStore(state => state.deleteFromPalette);
  const setUnderlayer = useAppStore(state => state.setUnderlayer);
  const setMotherColor = useAppStore(state => state.setMotherColor);
  const setColorPickerPipette = useAppStore(state => state.setColorPickerPipette);
  const setActiveTabKey = useAppStore(state => state.setActiveTabKey);

  const {t} = useLingui();
  const [compareOpen, setCompareOpen] = useState(false);

  const {type} = colorMixture;
  const {mixing, layering} = COLOR_MIXING[type];
  const canCompareMix = mixing && (colorMixture.parts.length >= 2 || !!colorMixture.white);
  const pastel: boolean = isPastel(type);

  const handleTitleEdited = (value: string) => {
    void saveToPalette({
      colorMixture: {
        ...colorMixture,
        name: value,
      },
      preserveDate: true,
    });
  };

  const handleShowOnPhotoClick = () => {
    const {samplingArea} = colorMixture;
    if (samplingArea) {
      setColorPickerPipette(samplingArea);
      void setActiveTabKey(TabKey.ColorPicker);
    }
  };

  const handleSetAsUnderlayerClick = () => {
    void setUnderlayer(rgbToHex(...colorMixture.layerRgb));
    void setActiveTabKey(TabKey.ColorPicker);
  };

  const handleSetAsMotherColorClick = () => {
    void setMotherColor(getColorId(colorMixture));
    void setActiveTabKey(TabKey.ColorPicker);
  };

  return (
    <Card size="small" {...props}>
      <Flex vertical gap="small" className="u-w-100">
        <Flex align="center" justify="space-between" gap="small" className="u-min-w-0">
          <Typography.Text
            editable={{
              text: colorMixture.name ?? '',
              onChange: handleTitleEdited,
              autoSize: false,
            }}
            ellipsis={{tooltip: true}}
            className="u-w-100 u-min-w-0 u-font-bold"
          >
            {colorMixture.name || <Trans>Untitled mixture</Trans>}
          </Typography.Text>
          <TonalValueTag rgb={colorMixture.layerRgb} />
        </Flex>

        <ColorMixtureDescription colorMixture={colorMixture} />

        <Row gutter={[8, 8]}>
          {showOnPhoto && (
            <Col xs={12}>
              <Button
                block
                size="small"
                icon={<PictureOutlined />}
                title={
                  colorMixture.samplingArea
                    ? t`Show this color on the reference photo.`
                    : t`This color was not sampled from a photo.`
                }
                onClick={handleShowOnPhotoClick}
                disabled={!colorMixture.samplingArea}
              >
                <Trans>Show on photo</Trans>
              </Button>
            </Col>
          )}
          <Col xs={12}>
            <Popconfirm
              title={<Trans>Delete the color mixture</Trans>}
              description={<Trans>Are you sure you want to delete this color mixture?</Trans>}
              onConfirm={() => void deleteFromPalette(colorMixture)}
              okText={<Trans>Delete</Trans>}
              cancelText={<Trans>Keep</Trans>}
            >
              <Button block size="small" icon={<DeleteOutlined />}>
                <Trans>Delete from palette</Trans>
              </Button>
            </Popconfirm>
          </Col>
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
          {canCompareMix && (
            <Col xs={12}>
              <Button
                block
                size="small"
                icon={<CameraOutlined />}
                onClick={() => {
                  setCompareOpen(true);
                }}
              >
                <Trans>Compare your mix</Trans>
              </Button>
            </Col>
          )}
        </Row>
        {canCompareMix && compareOpen && (
          <CompareMixtureDrawer
            colorMixture={colorMixture}
            onClose={() => {
              setCompareOpen(false);
            }}
          />
        )}
      </Flex>
    </Card>
  );
});
