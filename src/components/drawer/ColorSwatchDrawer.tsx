/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Drawer} from 'antd';
import {PaintMix} from '../../services/color';
import {Rgb} from '../../services/color/model';

type Props = {
  paintMixes?: PaintMix[];
  open?: boolean;
  onClose?: () => void;
};

export const ColorSwatchDrawer: React.FC<Props> = ({
  paintMixes,
  open = false,
  onClose = () => {},
}: Props) => {
  return (
    <Drawer
      title="Color swatch"
      placement="right"
      size="large"
      open={open}
      onClose={onClose}
      styles={{body: {padding: 0}}}
    >
      {paintMixes?.map((paintMix: PaintMix) => {
        const rgb: Rgb = new Rgb(...paintMix.paintMixLayerRgb);
        return (
          <>
            <div
              key={paintMix.id}
              className="color-swatch"
              style={{
                backgroundColor: rgb.toHex(),
                color: rgb.isDark() ? '#fff' : '#000',
              }}
            >
              {paintMix.name || 'Paint mix'}
            </div>
          </>
        );
      })}
    </Drawer>
  );
};
