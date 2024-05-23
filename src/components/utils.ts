/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import type {DefaultOptionType as SelectOptionType} from 'antd/es/select';
import type {ReactElement, ReactNode} from 'react';

export interface CascaderOption {
  value?: string | number;
  label: ReactNode;
  children?: CascaderOption[];
  disabled?: boolean;
}

export function filterSelectOptions(
  inputValue: string,
  option?: SelectOptionType | CascaderOption
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

export function filterCascaderOptions(inputValue: string, path: CascaderOption[]): boolean {
  return path.some(option => filterSelectOptions(inputValue, option));
}
