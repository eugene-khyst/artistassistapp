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

import {DeleteOutlined, PlusOutlined} from '@ant-design/icons';
import type {ColorMixture} from '@eugene-khyst/artistassistapp-color-mixer';
import {Trans} from '@lingui/react/macro';
import {Button, type ButtonProps, Popconfirm} from 'antd';
import {memo} from 'react';

import {useAppStore} from '@/stores/app-store';

type Props = {
  colorMixture: ColorMixture;
  linkToImage?: boolean;
} & ButtonProps;

export const AddToPaletteButton = memo(function AddToPaletteButton({
  colorMixture,
  linkToImage = true,
  ...props
}: Readonly<Props>) {
  const colorMixtureExists = useAppStore(
    state => !!state.paletteColorMixtures.get(colorMixture.type)?.has(colorMixture.key)
  );
  const saveToPalette = useAppStore(state => state.saveToPalette);
  const deleteFromPalette = useAppStore(state => state.deleteFromPalette);

  return colorMixtureExists ? (
    <Popconfirm
      title={<Trans>Delete the color mixture</Trans>}
      description={<Trans>Are you sure you want to delete this color mixture?</Trans>}
      onConfirm={() => void deleteFromPalette(colorMixture)}
      okText={<Trans>Delete</Trans>}
      cancelText={<Trans>Keep</Trans>}
    >
      <Button icon={<DeleteOutlined />} {...props}>
        <Trans>Delete from palette</Trans>
      </Button>
    </Popconfirm>
  ) : (
    <Button
      icon={<PlusOutlined />}
      onClick={() =>
        void saveToPalette({
          colorMixture,
          linkToImage,
        })
      }
      {...props}
    >
      <Trans>Add to palette</Trans>
    </Button>
  );
});
