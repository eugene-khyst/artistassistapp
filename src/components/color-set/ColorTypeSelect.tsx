/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import type {SelectProps} from 'antd';
import {Select} from 'antd';
import type {DefaultOptionType as SelectOptionType} from 'antd/es/select';

import {COLOR_TYPES} from '~/src/services/color';

const COLOR_TYPE_OPTIONS: SelectOptionType[] = [...COLOR_TYPES.entries()].map(
  ([value, {name}]) => ({value, label: name})
);

type Props = SelectProps;

export const ColorTypeSelect: React.FC<Props> = (props: Props) => {
  return <Select options={COLOR_TYPE_OPTIONS} placeholder="Select medium" {...props} />;
};
