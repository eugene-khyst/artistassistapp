/**
 * ArtistAssistApp
 * Copyright (C) 2023-2025  Eugene Khyst
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
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
    const key: string | undefined = element.key?.toString().toLowerCase();
    return matches(inputValue, key);
  }
}

export function filterCascaderOptions(inputValue: string, path: CascaderOptionType[]): boolean {
  return path.some(option => filterSelectOptions(inputValue, option));
}
