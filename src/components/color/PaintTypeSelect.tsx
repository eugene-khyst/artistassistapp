/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Select, SelectProps} from 'antd';
import {PAINT_TYPES} from '../../services/color';

const PAINT_TYPE_OPTIONS: SelectProps['options'] = [...PAINT_TYPES.entries()].map(
  ([value, label]) => ({value, label})
);

type Props = SelectProps;

export const PaintTypeSelect: React.FC<Props> = (props: Props) => {
  return <Select options={PAINT_TYPE_OPTIONS} placeholder="Select medium" {...props} />;
};
