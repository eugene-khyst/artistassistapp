/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {useAuth0} from '@auth0/auth0-react';
import type {SelectProps} from 'antd';
import {Select} from 'antd';
import type {DefaultOptionType as SelectOptionType} from 'antd/es/select';

import {filterSelectOptions} from '~/src/components/utils';
import type {AppUser} from '~/src/services/auth';
import {MEMBERSHIP_CLAIM} from '~/src/services/auth';
import {
  type ColorBrandDefinition,
  compareColorBrandsByFreeTierAndName,
  compareColorBrandsByName,
} from '~/src/services/color';

function getColorBrandOptions(
  brands?: Map<number, ColorBrandDefinition>,
  user?: AppUser
): SelectOptionType[] {
  if (!brands?.size) {
    return [];
  }
  const isUserInactive: boolean = !user?.[MEMBERSHIP_CLAIM]?.active;
  return [...brands.values()]
    .sort(isUserInactive ? compareColorBrandsByFreeTierAndName : compareColorBrandsByName)
    .map(({id, fullName, freeTier = false}) => ({
      value: id,
      label: fullName,
      disabled: !freeTier && isUserInactive,
    }));
}

type Props = SelectProps & {
  brands?: Map<number, ColorBrandDefinition>;
};

export const ColorBrandSelect: React.FC<Props> = ({brands, ...rest}: Props) => {
  const {user} = useAuth0<AppUser>();
  const options = getColorBrandOptions(brands, user);
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
