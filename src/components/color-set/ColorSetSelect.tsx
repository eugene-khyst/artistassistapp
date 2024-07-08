/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {PlusOutlined} from '@ant-design/icons';
import type {SelectProps} from 'antd';
import {Select, Typography} from 'antd';
import type {DefaultOptionType as SelectOptionType} from 'antd/es/select';

import {filterSelectOptions} from '~/src/components/utils';
import type {ColorBrandDefinition, ColorSetDefinition} from '~/src/services/color';

const newColorSetOption: SelectOptionType = {
  value: 0,
  label: (
    <>
      <PlusOutlined /> <Typography.Text>New color set</Typography.Text>
    </>
  ),
};

function getColorSetName(
  brandIds: number[],
  colors: Record<number, number[]>,
  brands?: Map<number, ColorBrandDefinition>
): string | undefined {
  if (!brands) {
    return;
  }
  return brandIds
    .map((brandId: number): string => {
      const {shortName, fullName} = brands.get(brandId) || {};
      const colorSetSize = colors[brandId]?.length;
      return `${shortName ?? fullName} ${colorSetSize} ${colorSetSize > 1 ? 'colors' : 'color'}`;
    })
    .filter(name => !!name)
    .join(', ');
}

function getColorSetOptions(
  colorSets?: ColorSetDefinition[],
  brands?: Map<number, ColorBrandDefinition>
): SelectOptionType[] {
  if (!colorSets?.length) {
    return [newColorSetOption];
  }
  return [
    newColorSetOption,
    ...colorSets.map(({id, name, brands: brandIds, colors}: ColorSetDefinition) => ({
      value: id,
      label: name || getColorSetName(brandIds, colors, brands),
    })),
  ];
}

type Props = SelectProps & {
  colorSets?: ColorSetDefinition[];
  brands?: Map<number, ColorBrandDefinition>;
};

export const ColorSetSelect: React.FC<Props> = ({colorSets, brands, ...rest}: Props) => {
  const options = getColorSetOptions(colorSets, brands);
  return (
    <Select
      options={options}
      placeholder="Select from your recent color sets"
      showSearch
      filterOption={filterSelectOptions}
      allowClear
      {...rest}
    />
  );
};
