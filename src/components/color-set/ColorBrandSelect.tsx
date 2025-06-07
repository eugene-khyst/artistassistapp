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

import type {SelectProps} from 'antd';
import {Select} from 'antd';
import type {DefaultOptionType as SelectOptionType} from 'antd/es/select';
import type {FlattenOptionData} from 'rc-select/lib/interface';

import {filterSelectOptions} from '~/src/components/utils';
import {useAuth} from '~/src/hooks/useAuth';
import type {User} from '~/src/services/auth/types';
import {hasAccessTo} from '~/src/services/auth/utils';
import {
  compareColorBrandsByFreeTierAndName,
  compareColorBrandsByName,
} from '~/src/services/color/colors';
import type {ColorBrandDefinition} from '~/src/services/color/types';

function getColorBrandOptions(
  user?: User | null,
  brands?: Map<number, ColorBrandDefinition>
): (SelectOptionType & {colorCount?: number})[] {
  if (!brands?.size) {
    return [];
  }
  return [...brands.values()]
    .sort(!user ? compareColorBrandsByFreeTierAndName : compareColorBrandsByName)
    .map(brand => {
      const {id, fullName, colorCount} = brand;
      return {
        value: id,
        label: fullName,
        fullName,
        colorCount,
        disabled: !hasAccessTo(user, brand),
      };
    });
}

const colorBrandOptionRender = ({
  data: {fullName, colorCount},
}: FlattenOptionData<SelectOptionType & {colorCount?: number}>) => (
  <>
    {fullName}
    {!!colorCount && ` (${colorCount} colors)`}
  </>
);

type Props = Omit<
  SelectProps,
  'options' | 'placeholder' | 'showSearch' | 'filterOption' | 'optionRender' | 'allowClear'
> & {
  brands?: Map<number, ColorBrandDefinition>;
};

export const ColorBrandSelect: React.FC<Props> = ({brands, ...rest}: Props) => {
  const {user} = useAuth();
  const options = getColorBrandOptions(user, brands);
  return (
    <Select
      options={options}
      placeholder="Select brands"
      showSearch
      filterOption={filterSelectOptions}
      optionRender={colorBrandOptionRender}
      allowClear
      {...rest}
    />
  );
};
