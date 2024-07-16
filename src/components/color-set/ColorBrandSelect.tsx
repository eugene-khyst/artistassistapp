/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import type {SelectProps} from 'antd';
import {Select} from 'antd';
import type {DefaultOptionType as SelectOptionType} from 'antd/es/select';

import {filterSelectOptions} from '~/src/components/utils';
import {type ColorBrandDefinition, compareColorBrandsByName} from '~/src/services/color';

function getColorBrandOptions(brands?: Map<number, ColorBrandDefinition>): SelectOptionType[] {
  if (!brands?.size) {
    return [];
  }
  return [...brands.values()]
    .sort(compareColorBrandsByName)
    .map(({id, fullName}) => ({value: id, label: fullName}));
}

type Props = SelectProps & {
  brands?: Map<number, ColorBrandDefinition>;
};

export const ColorBrandSelect: React.FC<Props> = ({brands, ...rest}: Props) => {
  const options = getColorBrandOptions(brands);
  return (
    <Select
      options={options}
      placeholder="Select brands"
      showSearch
      filterOption={filterSelectOptions}
      allowClear
      {...rest}
    />
  );
};
