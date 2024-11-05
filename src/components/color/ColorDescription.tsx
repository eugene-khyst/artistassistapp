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

import {Space, Tooltip, Typography} from 'antd';

import {OpacityIcon} from '~/src/components/color/OpacityIcon';
import {useColorBrands} from '~/src/hooks';
import type {Color, ColorBrandDefinition, ColorType} from '~/src/services/color';
import {formatColorLabel} from '~/src/services/color';

import {ColorSquare} from './ColorSquare';

interface Props {
  colorType: ColorType;
  color: Color;
  text?: string | number;
}

export const ColorDescription: React.FC<Props> = ({colorType, color, text}: Props) => {
  const {brands} = useColorBrands(colorType);

  const {brand: brandId, rgb, opacity} = color;
  const brand: ColorBrandDefinition | undefined = brands?.get(brandId);

  if (!brand) {
    return <ColorSquare color="fff" size="large" />;
  }

  const {shortName, fullName} = brand;
  return (
    <Space size="small">
      <ColorSquare color={rgb} size="large" text={text} />
      <span>
        <Tooltip title={fullName}>
          <Typography.Text>{shortName || fullName}</Typography.Text>
        </Tooltip>
        <br />
        <Space size="small" align="center">
          <Typography.Text strong>{formatColorLabel(color, brand)}</Typography.Text>
          <OpacityIcon opacity={opacity} />
        </Space>
      </span>
    </Space>
  );
};
