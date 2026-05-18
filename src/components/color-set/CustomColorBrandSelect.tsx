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

import {PlusOutlined} from '@ant-design/icons';
import {Trans, useLingui} from '@lingui/react/macro';
import type {SelectProps} from 'antd';
import {Button, Grid, Select, Space, Typography} from 'antd';
import type {DefaultOptionType as SelectOptionType} from 'antd/es/select';
import {useMemo} from 'react';

import {filterSelectOptions} from '~/src/components/utils';
import type {CustomColorBrandDefinition} from '~/src/services/color/types';
import {byDate, reverseOrder} from '~/src/utils/comparator';

const showSearch = {filterOption: filterSelectOptions};

const newCustomColorBrandOption: SelectOptionType = {
  value: 0,
  label: (
    <>
      <PlusOutlined />{' '}
      <Typography.Text>
        <Trans>New brand</Trans>
      </Typography.Text>
    </>
  ),
};

function getCustomColorBrandOptions(
  customColorBrands?: CustomColorBrandDefinition[]
): SelectOptionType[] {
  if (!customColorBrands?.length) {
    return [newCustomColorBrandOption];
  }
  return [
    newCustomColorBrandOption,
    ...customColorBrands
      .slice()
      .sort(reverseOrder(byDate(({date}) => date)))
      .map(({id, name}: CustomColorBrandDefinition) => ({
        value: id,
        label: name,
      })),
  ];
}

type Props = Omit<SelectProps, 'options' | 'placeholder' | 'showSearch'> & {
  customColorBrands?: CustomColorBrandDefinition[];
  onCreateNewClick?: () => void;
};

export function CustomColorBrandSelect({
  customColorBrands,
  onCreateNewClick,
  ...rest
}: Readonly<Props>) {
  const screens = Grid.useBreakpoint();

  const {t} = useLingui();

  const options = useMemo(() => getCustomColorBrandOptions(customColorBrands), [customColorBrands]);

  return (
    <Space.Compact block>
      <Select
        options={options}
        placeholder={t`Select from your recent brands`}
        showSearch={showSearch}
        {...rest}
      />
      <Button icon={<PlusOutlined />} onClick={onCreateNewClick}>
        {screens.sm && t`Create new`}
      </Button>
    </Space.Compact>
  );
}
