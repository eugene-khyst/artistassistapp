/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Col, Drawer, Grid, Row} from 'antd';

import {useCreateObjectUrl} from '~/src/hooks';
import type {ColorMixture} from '~/src/services/color';
import {Rgb} from '~/src/services/color/space';
import {useAppStore} from '~/src/stores/app-store';

type Props = {
  colorMixtures?: ColorMixture[];
  open?: boolean;
  onClose?: () => void;
};

export const ColorSwatchDrawer: React.FC<Props> = ({
  colorMixtures,
  open = false,
  onClose = () => {},
}: Props) => {
  const imageFile = useAppStore(state => state.imageFile);

  const screens = Grid.useBreakpoint();

  const imageSrc: string | undefined = useCreateObjectUrl(imageFile?.file);

  const isFullHeight = screens['sm'] || !imageSrc;
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
