/**
 * ArtistAssistApp
 * Copyright (C) 2023-2024  Eugene Khyst
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
