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

import {DeleteOutlined, PlusOutlined} from '@ant-design/icons';
import type {ButtonProps} from 'antd';
import {Button, Popconfirm} from 'antd';

import type {ColorMixture} from '~/src/services/color/types';
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
      onClick={() => void saveToPalette({...colorMixture}, linkToImage)}
      style={style}
    >
      Add to palette
    </Button>
  );
};
