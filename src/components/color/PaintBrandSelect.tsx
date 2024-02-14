/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Select, SelectProps} from 'antd';
import {CSSProperties} from 'react';
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

type Props = {
  value?: number[];
  onChange?: (value: number[]) => void;
  type?: PaintType;
  mode?: 'multiple';
  style?: CSSProperties;
};

export const PaintBrandSelect: React.FC<Props> = ({value, onChange, type, mode, style}: Props) => {
  const options = getPaintBrandOptions(type);
  return (
    <Select
      value={value}
      onChange={onChange}
      mode={mode}
      options={options}
      placeholder="Select brands"
      showSearch
      filterOption={filterSelectOptions}
      allowClear
      style={style}
    />
  );
};
