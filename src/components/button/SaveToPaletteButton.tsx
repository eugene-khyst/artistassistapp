/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {MinusOutlined, PlusOutlined} from '@ant-design/icons';
import {Button, ButtonProps, Popconfirm} from 'antd';
import {PaintMix} from '~/src/services/color';

type Props = {
  paintMix: PaintMix;
  paintMixes?: PaintMix[];
  saveNewPaintMix: (paintMix: PaintMix) => void;
  deletePaintMix: (paintMixId: string) => void;
} & ButtonProps;

export const SaveToPaletteButton: React.FC<Props> = ({
  paintMix,
  paintMixes,
  saveNewPaintMix,
  deletePaintMix,
  size,
  style,
}: Props) => {
  const paintMixExists = paintMixes?.some((pm: PaintMix) => pm.id === paintMix.id);
  const handleSaveButtonClick = () => {
    saveNewPaintMix(paintMix);
  };
  const handleDeleteButtonClick = () => {
    deletePaintMix(paintMix.id);
  };
  return paintMixExists ? (
    <Popconfirm
      title="Remove the color mixture"
      description="Are you sure you want to remove this color mixture?"
      onConfirm={handleDeleteButtonClick}
      okText="Yes"
      cancelText="No"
    >
      <Button size={size} icon={<MinusOutlined />} style={style}>
        Remove from palette
      </Button>
    </Popconfirm>
  ) : (
    <Button size={size} icon={<PlusOutlined />} onClick={handleSaveButtonClick} style={style}>
      Add to palette
    </Button>
  );
};
