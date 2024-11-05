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

import type {SelectProps} from 'antd';
import {Select, Space, Typography} from 'antd';
import type {DefaultOptionType as SelectOptionType} from 'antd/es/select';

import {ColorSquare} from '~/src/components/color/ColorSquare';
import {filterSelectOptions} from '~/src/components/utils';
import type {ColorBrandDefinition, ColorDefinition} from '~/src/services/color';
import {formatColorLabel} from '~/src/services/color';

function getColorOptions(
  brand: ColorBrandDefinition,
  colors?: Map<number, ColorDefinition>
): SelectOptionType[] {
  if (!colors?.size) {
    return [];
  }
  return [...colors.values()].map((color: ColorDefinition) => {
    const label: string = formatColorLabel(color, brand);
    return {
      value: color.id,
      label: (
        <Space size="small" align="center" key={label}>
          <ColorSquare color={color.hex} />
          <Typography.Text>{label}</Typography.Text>
        </Space>
      ),
    };
  });
}

type Props = SelectProps & {
  brand: ColorBrandDefinition;
  colors?: Map<number, ColorDefinition>;
};

export const ColorSelect: React.FC<Props> = ({brand, colors, ...rest}: Props) => {
  const options = getColorOptions(brand, colors);
  return (
    <Select
      options={options}
      placeholder="Select colors"
      showSearch
      filterOption={filterSelectOptions}
      allowClear
      {...rest}
    />
  );
};
