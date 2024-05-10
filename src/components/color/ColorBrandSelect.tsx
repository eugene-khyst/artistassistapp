/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import type {SelectProps} from 'antd';
import {Select} from 'antd';

import {filterSelectOptions} from '~/src/components/utils';
import type {ColorType} from '~/src/services/color';
import {COLOR_BRANDS, compareColorBrandEntries} from '~/src/services/color';

function getColorBrandOptions(type?: ColorType): SelectProps['options'] {
  if (!type) {
    return [];
  }
  return [...(COLOR_BRANDS.get(type)?.entries() ?? [])]
    .sort(compareColorBrandEntries)
    .map(([value, {fullName: label}]) => ({value, label}));
}

type Props = SelectProps & {
  type?: ColorType;
};

export const ColorBrandSelect: React.FC<Props> = ({type, ...rest}: Props) => {
  const options = getColorBrandOptions(type);
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
