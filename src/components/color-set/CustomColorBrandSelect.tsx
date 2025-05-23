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

import {PlusOutlined} from '@ant-design/icons';
import type {SelectProps} from 'antd';
import {Button, Grid, Select, Space, Typography} from 'antd';
import type {DefaultOptionType as SelectOptionType} from 'antd/es/select';

import {filterSelectOptions} from '~/src/components/utils';
import {compareByDate} from '~/src/services/color/colors';
import type {CustomColorBrandDefinition} from '~/src/services/color/types';
import {reverseOrder} from '~/src/utils/array';

const newCustomColorBrandOption: SelectOptionType = {
  value: 0,
  label: (
    <>
      <PlusOutlined /> <Typography.Text>New brand</Typography.Text>
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
      .sort(reverseOrder(compareByDate))
      .map(({id, name}: CustomColorBrandDefinition) => ({
        value: id,
        label: name,
      })),
  ];
}

type Props = Omit<SelectProps, 'options' | 'placeholder' | 'showSearch' | 'filterOption'> & {
  customColorBrands?: CustomColorBrandDefinition[];
  onCreateNewClick?: () => void;
};

export const CustomColorBrandSelect: React.FC<Props> = ({
  customColorBrands,
  onCreateNewClick,
  ...rest
}: Props) => {
  const screens = Grid.useBreakpoint();

  const options = getCustomColorBrandOptions(customColorBrands);
  return (
    <Space.Compact block>
      <Select
        options={options}
        placeholder="Select from your recent brands"
        showSearch
        filterOption={filterSelectOptions}
        {...rest}
      />
      <Button icon={<PlusOutlined />} onClick={onCreateNewClick}>
        {screens.sm && 'Create new'}
      </Button>
    </Space.Compact>
  );
};
