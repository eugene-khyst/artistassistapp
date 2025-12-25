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

import {useLingui} from '@lingui/react/macro';
import {Col, Drawer, Grid, Row} from 'antd';

import {useCreateObjectUrl} from '~/src/hooks/useCreateObjectUrl';
import {Rgb} from '~/src/services/color/space/rgb';
import type {ColorMixture} from '~/src/services/color/types';
import {useAppStore} from '~/src/stores/app-store';

interface Props {
  colorMixtures?: ColorMixture[];
  open?: boolean;
  onClose?: () => void;
}

export const ColorSwatchDrawer: React.FC<Props> = ({
  colorMixtures,
  open = false,
  onClose,
}: Props) => {
  const originalImageFile = useAppStore(state => state.originalImageFile);

  const screens = Grid.useBreakpoint();

  const {t} = useLingui();

  const imageUrl: string | undefined = useCreateObjectUrl(originalImageFile);

  const isFullHeight = screens.sm || !imageUrl;
  const imageHeight = imageUrl ? `calc((100dvh - 60px) / ${isFullHeight ? 1 : 2})` : 0;
  const colorSwatchHeight = `calc((100dvh - 60px) / ${isFullHeight ? 1 : 2})`;
  const colorStripeHeight = `max(calc((100dvh - 60px) / (${
    Math.min(colorMixtures?.length || 10, 10) * (isFullHeight ? 1 : 2)
  })), 24px)`;

  return (
    <Drawer
      title={t`Color swatch`}
      placement="right"
      width="100%"
      open={open}
      onClose={onClose}
      styles={{body: {padding: 0}}}
    >
      <Row>
        <Col
          xs={24}
          sm={12}
          style={{
            display: 'flex',
            justifyContent: 'center',
            height: imageHeight,
            lineHeight: imageHeight,
            textAlign: 'center',
          }}
        >
          {imageUrl && (
            <img
              alt={t`Reference`}
              src={imageUrl}
              style={{
                display: 'block',
                maxWidth: '100%',
                maxHeight: '100%',
                verticalAlign: 'middle',
              }}
            />
          )}
        </Col>
        <Col xs={24} sm={12} style={{maxHeight: colorSwatchHeight, overflowY: 'auto'}}>
          {colorMixtures?.map((colorMixture: ColorMixture) => {
            const rgb = new Rgb(...colorMixture.layerRgb);
            return (
              <div
                key={colorMixture.key}
                style={{
                  height: colorStripeHeight,
                  lineHeight: colorStripeHeight,
                  textAlign: 'center',
                  fontSize: 14,
                  fontWeight: 'bold',
                  backgroundColor: rgb.toHex(),
                  color: rgb.isDark() ? '#fff' : '#000',
                }}
              >
                {colorMixture.name || t`Untitled mixture`}
              </div>
            );
          })}
        </Col>
      </Row>
    </Drawer>
  );
};
