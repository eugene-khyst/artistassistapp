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

import {Select} from 'antd';
import type {DefaultOptionType as SelectOptionType, SelectProps} from 'antd/es/select';
import React from 'react';

import {OpacityIcon} from '~/src/components/color/OpacityIcon';
import {ColorOpacity} from '~/src/services/color/types';

const OPACITY_OPTIONS: SelectOptionType[] = [
  ColorOpacity.Transparent,
  ColorOpacity.SemiTransparent,
  ColorOpacity.SemiOpaque,
  ColorOpacity.Opaque,
].map(
  (opacity): SelectOptionType => ({
    label: <OpacityIcon key={opacity} opacity={opacity} />,
    value: opacity,
  })
);

type Props = Omit<SelectProps, 'options' | 'placeholder' | 'allowClear'>;

export const OpacitySelect: React.FC<Props> = props => {
  return <Select options={OPACITY_OPTIONS} placeholder="Opa." allowClear {...props} />;
};
