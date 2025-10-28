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

import {useLingui} from '@lingui/react/macro';
import type {SelectProps} from 'antd';
import {Flex, Select, Typography} from 'antd';
import type {DefaultOptionType as SelectOptionType} from 'antd/es/select';

import {ColorSquare} from '~/src/components/color/ColorSquare';
import {OpacityIcon} from '~/src/components/color/OpacityIcon';
import {WarmthIcon} from '~/src/components/color/WarmthIcon';
import {filterSelectOptions} from '~/src/components/utils';
import {formatColorLabel} from '~/src/services/color/colors';
import type {ColorBrandDefinition, ColorDefinition} from '~/src/services/color/types';

function getColorOptions(
  brand: ColorBrandDefinition,
  colors?: Map<number, ColorDefinition>
): SelectOptionType[] {
  if (!colors?.size) {
    return [];
  }
  return [...colors.values()].map((color: ColorDefinition) => {
    const {hex, opacity, warmth} = color;
    const label: string = formatColorLabel(color, brand);
    return {
      value: color.id,
      label: (
        <Flex key={label} gap="small" align="center">
          <ColorSquare color={hex} />
          <Typography.Text>{label}</Typography.Text>
          <OpacityIcon opacity={opacity} />
          <WarmthIcon warmth={warmth} />
        </Flex>
      ),
    };
  });
}

type Props = Omit<
  SelectProps,
  'options' | 'placeholder' | 'showSearch' | 'filterOption' | 'allowClear'
> & {
  brand: ColorBrandDefinition;
  colors?: Map<number, ColorDefinition>;
};

export const ColorSelect: React.FC<Props> = ({brand, colors, ...rest}: Props) => {
  const {t} = useLingui();

  const options = getColorOptions(brand, colors);
  return (
    <Select
      options={options}
      placeholder={t`Select colors`}
      showSearch
      filterOption={filterSelectOptions}
      allowClear
      {...rest}
    />
  );
};
