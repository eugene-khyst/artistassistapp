/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Select, SelectProps} from 'antd';
import {PAINT_TYPES} from '../../services/color';

const PAINT_TYPE_OPTIONS: SelectProps['options'] = [...PAINT_TYPES.entries()].map(
  ([value, label]) => ({value, label})
);

type Props = {
  value?: number;
  onChange?: (value: number) => void;
};

export const PaintTypeSelect: React.FC<Props> = ({value, onChange}: Props) => {
  return (
    <Select
      value={value}
      onChange={onChange}
      options={PAINT_TYPE_OPTIONS}
      placeholder="Select medium"
    />
  );
};
