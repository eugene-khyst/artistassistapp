/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import type {DefaultOptionType as CascaderOptionType} from 'antd/es/cascader';
import type {DefaultOptionType as SelectOptionType} from 'antd/es/select';
import type {ReactElement} from 'react';

function tokenize(str: string): string[] {
  return str.trim().toLowerCase().split(/\s+/);
}

function matches(query: string, str?: string): boolean {
  if (!str) {
    return false;
  }
  const strTokens: string[] = tokenize(str);
  const queryTokens: string[] = tokenize(query);
  return queryTokens.every(queryToken =>
    strTokens.some(strToken => strToken.startsWith(queryToken))
  );
}

export function filterSelectOptions(
  inputValue: string,
  option?: SelectOptionType | CascaderOptionType
): boolean {
  if (!option?.label) {
    return false;
  }
  const {label} = option;
  if (typeof label === 'string') {
    return matches(inputValue, label);
  } else {
    const element = label as ReactElement;
    const key: string | undefined = element.key?.toString()?.toLowerCase();
    return matches(inputValue, key);
  }
}

export function filterCascaderOptions(inputValue: string, path: CascaderOptionType[]): boolean {
  return path.some(option => filterSelectOptions(inputValue, option));
}
