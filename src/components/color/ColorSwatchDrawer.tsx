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

import {useLingui} from '@lingui/react/macro';
import {Col, Drawer, Grid, Row} from 'antd';

import {useCreateObjectUrl} from '~/src/hooks/useCreateObjectUrl';
import {COLOR_MIXTURES_COMPARATORS, ColorMixtureSort} from '~/src/services/color/color-mixer';
import {isRgbDark, rgbToHex} from '~/src/services/color/space/rgb';
import type {ColorMixture} from '~/src/services/color/types';
import {useAppStore} from '~/src/stores/app-store';
import {decorateSortUndecorate} from '~/src/utils/array';
import type {CssVariables} from '~/src/utils/types';

import styles from './ColorSwatchDrawer.module.css';

interface Props {
  colorMixtures?: ColorMixture[];
  open?: boolean;
  onClose?: () => void;
}

export function ColorSwatchDrawer({colorMixtures, open = false, onClose}: Readonly<Props>) {
  const originalImageFile = useAppStore(state => state.originalImageFile);

  const screens = Grid.useBreakpoint();

  const {t} = useLingui();

  const imageUrl: string | undefined = useCreateObjectUrl(originalImageFile);

  const isFullHeight: boolean = screens.sm || !imageUrl;
  const divider: number = isFullHeight ? 1 : 2;
  const imageHeight = imageUrl ? `calc((100dvh - 60px) / ${divider})` : 0;
  const colorSwatchHeight = `calc((100dvh - 60px) / ${divider})`;
  const colorStripeHeight = `max(calc((100dvh - 60px) / (${
    Math.min(colorMixtures?.length || 10, 10) * divider
  })), 24px)`;
  const imageColumnStyle: CssVariables = {'--image-height': imageHeight};
  const swatchColumnStyle: CssVariables = {'--swatch-height': colorSwatchHeight};

  return (
    <Drawer
      title={t`Color swatch`}
      placement="right"
      size="100%"
      open={open}
      onClose={onClose}
      classNames={{body: styles['body']}}
    >
      <Row>
        <Col xs={24} sm={12} className={styles['imageColumn']} style={imageColumnStyle}>
          {imageUrl && <img alt={t`Reference`} src={imageUrl} className={styles['image']} />}
        </Col>
        <Col xs={24} sm={12} className={styles['swatchColumn']} style={swatchColumnStyle}>
          {decorateSortUndecorate(
            colorMixtures,
            COLOR_MIXTURES_COMPARATORS[ColorMixtureSort.ByHue]
          )?.map((colorMixture: ColorMixture) => {
            const {layerRgb} = colorMixture;
            const stripeStyle: CssVariables = {
              '--stripe-height': colorStripeHeight,
              '--stripe-bg': rgbToHex(...layerRgb),
              '--stripe-color': isRgbDark(...layerRgb) ? '#fff' : '#000',
            };
            return (
              <div key={colorMixture.key} className={styles['stripe']} style={stripeStyle}>
                {colorMixture.name || t`Untitled mixture`}
              </div>
            );
          })}
        </Col>
      </Row>
    </Drawer>
  );
}
