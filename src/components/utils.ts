/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import type {DefaultOptionType as CascaderOptionType} from 'antd/es/cascader';
import type {DefaultOptionType as SelectOptionType} from 'antd/es/select';
import type {ReactElement} from 'react';

export function filterSelectOptions(
  inputValue: string,
  option?: SelectOptionType | CascaderOptionType
): boolean {
  if (!option?.label) {
    return false;
  }
  const searchTerm: string = inputValue.trim().toLowerCase();
  if (typeof option.label === 'string') {
    return option.label.toLowerCase().includes(searchTerm);
  }
  const element = option.label as ReactElement;
  const key: string | undefined = element.key?.toString()?.toLowerCase();
  return key?.includes(searchTerm) ?? false;
}

export function filterCascaderOptions(inputValue: string, path: CascaderOptionType[]): boolean {
  return path.some(option => filterSelectOptions(inputValue, option));
}
