/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import type {SelectProps} from 'antd';
import {Select} from 'antd';
import type {DefaultOptionType as SelectOptionType} from 'antd/es/select';

import {filterSelectOptions} from '~/src/components/utils';
import {useAuth} from '~/src/hooks/useAuth';
import type {User} from '~/src/services/auth';
import {
  type ColorBrandDefinition,
  compareColorBrandsByFreeTierAndName,
  compareColorBrandsByName,
} from '~/src/services/color';

function getColorBrandOptions(
  user: User | null,
  brands?: Map<number, ColorBrandDefinition>
): SelectOptionType[] {
  if (!brands?.size) {
    return [];
  }
  return [...brands.values()]
    .sort(!user ? compareColorBrandsByFreeTierAndName : compareColorBrandsByName)
    .map(({id, fullName, freeTier = false}) => ({
      value: id,
      label: fullName,
      disabled: !freeTier && !user,
    }));
}

type Props = SelectProps & {
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
      allowClear
      {...rest}
    />
  );
};
