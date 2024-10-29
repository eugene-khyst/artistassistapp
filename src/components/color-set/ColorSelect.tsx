/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
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
