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

import {Col, Drawer, Grid, Row} from 'antd';

import {useCreateObjectUrl} from '~/src/hooks';
import {useImageFileToBlob} from '~/src/hooks/useImageFileToBlob';
import type {ColorMixture} from '~/src/services/color';
import {Rgb} from '~/src/services/color/space';
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
  const imageFile = useAppStore(state => state.imageFile);

  const screens = Grid.useBreakpoint();

  const blob = useImageFileToBlob(imageFile);
  const imageSrc: string | undefined = useCreateObjectUrl(blob);

  const isFullHeight = screens.sm || !imageSrc;
  const imageHeight = imageSrc ? `calc((100vh - 60px) / ${isFullHeight ? 1 : 2})` : 0;
  const colorSwatchHeight = `calc((100vh - 60px) / ${isFullHeight ? 1 : 2})`;
  const colorStripeHeight = `max(calc((100vh - 60px) / (${
    Math.min(colorMixtures?.length || 10, 10) * (isFullHeight ? 1 : 2)
  })), 24px)`;

  return (
    <Drawer
      title="Color swatch"
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
          style={{height: imageHeight, lineHeight: imageHeight, textAlign: 'center'}}
        >
          {imageSrc && (
            <img
              src={imageSrc}
              style={{maxWidth: '100%', maxHeight: '100%', verticalAlign: 'middle'}}
            />
          )}
        </Col>
        <Col xs={24} sm={12} style={{maxHeight: colorSwatchHeight, overflowY: 'auto'}}>
          {colorMixtures?.map((colorMixture: ColorMixture) => {
            const rgb: Rgb = new Rgb(...colorMixture.layerRgb);
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
                {colorMixture.name || 'Color mixture'}
              </div>
            );
          })}
        </Col>
      </Row>
    </Drawer>
  );
};
