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

import {useLingui} from '@lingui/react/macro';
import type {SelectProps} from 'antd';
import {Select} from 'antd';
import type {DefaultOptionType as SelectOptionType} from 'antd/es/select';

import {COLOR_TYPE_LABELS} from '~/src/components/messages';
import {COLOR_TYPES} from '~/src/services/color/colors';
import type {ColorType} from '~/src/services/color/types';

type Props = Omit<SelectProps, 'options' | 'placeholder'>;

export const ColorTypeSelect: React.FC<Props> = (props: Props) => {
  const {t} = useLingui();

  const options: SelectOptionType[] = COLOR_TYPES.map((colorType: ColorType) => ({
    value: colorType,
    label: t(COLOR_TYPE_LABELS[colorType]),
  }));

  return <Select options={options} placeholder={t`Select art medium`} {...props} />;
};
