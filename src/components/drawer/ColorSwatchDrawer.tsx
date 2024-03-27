/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Col, Drawer, Grid, Row} from 'antd';
import {useCreateObjectUrl} from '~/src/hooks/useCreateObjectUrl';
import {PaintMix} from '~/src/services/color';
import {Rgb} from '~/src/services/color/model';

type Props = {
  paintMixes?: PaintMix[];
  open?: boolean;
  onClose?: () => void;
  blob?: Blob;
};

export const ColorSwatchDrawer: React.FC<Props> = ({
  paintMixes,
  open = false,
  onClose = () => {},
  blob,
}: Props) => {
  const screens = Grid.useBreakpoint();

  const imageSrc: string | undefined = useCreateObjectUrl(blob);

  const isFullHeight = screens['sm'] || !imageSrc;
  const imageHeight = imageSrc ? `calc((100vh - 60px) / ${isFullHeight ? 1 : 2})` : 0;
  const colorSwatchHeight = `calc((100vh - 60px) / ${isFullHeight ? 1 : 2})`;
  const colorStripeHeight = `max(calc((100vh - 60px) / (${
    Math.min(paintMixes?.length || 10, 10) * (isFullHeight ? 1 : 2)
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
          {paintMixes?.map((paintMix: PaintMix) => {
            const rgb: Rgb = new Rgb(...paintMix.paintMixLayerRgb);
            return (
              <div
                key={paintMix.id}
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
                {paintMix.name || 'Color mixture'}
              </div>
            );
          })}
        </Col>
      </Row>
    </Drawer>
  );
};
