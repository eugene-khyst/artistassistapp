/**
 * ArtistAssistApp
 * Copyright (C) 2023-2026  Eugene Khyst
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
import type {FlattenOptionData} from '@rc-component/select/es/interface';
import type {SelectProps} from 'antd';
import {Select} from 'antd';
import type {DefaultOptionType as SelectOptionType} from 'antd/es/select';
import {useCallback, useMemo} from 'react';

import {filterSelectOptions} from '@/components/utils';
import type {User} from '@/services/auth/types';
import {hasAccessTo} from '@/services/auth/utils';
import {compareColorBrandsByName} from '@/services/color/colors';
import type {ColorBrandDefinition} from '@/services/color/types';
import {useAppStore} from '@/stores/app-store';

const showSearch = {filterOption: filterSelectOptions};

function getColorBrandOptions(
  user?: User | null,
  brands?: Map<number, ColorBrandDefinition>
): (SelectOptionType & {colorCount?: number})[] {
  if (!brands?.size) {
    return [];
  }
  return [...brands.values()]
    .sort(compareColorBrandsByName({prioritizeFreeTier: !user}))
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

type Props = Omit<
  SelectProps,
  'options' | 'placeholder' | 'showSearch' | 'optionRender' | 'allowClear'
> & {
  brands?: Map<number, ColorBrandDefinition>;
};

export function ColorBrandSelect({brands, ...rest}: Readonly<Props>) {
  const user = useAppStore(state => state.auth?.user);

  const {t} = useLingui();

  const options = useMemo(() => getColorBrandOptions(user, brands), [user, brands]);

  const optionRender = useCallback(
    ({
      data: {fullName, colorCount},
    }: FlattenOptionData<SelectOptionType & {colorCount?: number}>) => (
      <>
        {fullName} {!!colorCount && t`(${colorCount} colors)`}
      </>
    ),
    [t]
  );

  return (
    <Select
      options={options}
      placeholder={t`Select brands`}
      showSearch={showSearch}
      optionRender={optionRender}
      allowClear
      {...rest}
    />
  );
}
