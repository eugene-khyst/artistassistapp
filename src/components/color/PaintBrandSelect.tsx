/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Select, SelectProps} from 'antd';
import {PAINT_BRANDS, PaintType, comparePaintBrandEntries} from '../../services/color';
import {filterSelectOptions} from '../utils';

function getPaintBrandOptions(type?: PaintType): SelectProps['options'] {
  if (!type) {
    return [];
  }
  return [...(PAINT_BRANDS.get(type)?.entries() ?? [])]
    .sort(comparePaintBrandEntries)
    .map(([value, {fullName: label}]) => ({value, label}));
}

type Props = SelectProps & {
  type?: PaintType;
};

export const PaintBrandSelect: React.FC<Props> = ({type, ...rest}: Props) => {
  const options = getPaintBrandOptions(type);
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
