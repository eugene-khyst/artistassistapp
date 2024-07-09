/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {DeleteOutlined, PlusOutlined} from '@ant-design/icons';
import type {ButtonProps} from 'antd';
import {Button, Popconfirm} from 'antd';

import type {ColorMixture} from '~/src/services/color';
import {useAppStore} from '~/src/stores/app-store';

type Props = {
  colorMixture: ColorMixture;
  linkToImage?: boolean;
} & ButtonProps;

export const AddToPaletteButton: React.FC<Props> = ({
  colorMixture,
  linkToImage = true,
  size,
  style,
}: Props) => {
  const paletteColorMixtures = useAppStore(state => state.paletteColorMixtures);
  const saveToPalette = useAppStore(state => state.saveToPalette);
  const deleteFromPalette = useAppStore(state => state.deleteFromPalette);

  const colorMixtureExists = paletteColorMixtures.some(
    ({key}: ColorMixture) => key === colorMixture.key
  );

  return colorMixtureExists ? (
    <Popconfirm
      title="Remove the color mixture"
      description="Are you sure you want to remove this color mixture?"
      onConfirm={() => void deleteFromPalette(colorMixture)}
      okText="Yes"
      cancelText="No"
    >
      <Button size={size} icon={<DeleteOutlined />} style={style}>
        Remove from palette
      </Button>
    </Popconfirm>
  ) : (
    <Button
      size={size}
      icon={<PlusOutlined />}
      onClick={() => void saveToPalette(colorMixture, linkToImage)}
      style={style}
    >
      Add to palette
    </Button>
  );
};
