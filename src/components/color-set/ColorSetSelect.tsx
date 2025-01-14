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
import {compareByDate, getColorSetName} from '~/src/services/color/colors';
import type {ColorBrandDefinition, ColorSetDefinition} from '~/src/services/color/types';

const newColorSetOption: SelectOptionType = {
  value: 0,
  label: (
    <>
      <PlusOutlined /> <Typography.Text>New color set</Typography.Text>
    </>
  ),
};

function getColorSetOptions(
  colorSets?: ColorSetDefinition[],
  brands?: Map<number, ColorBrandDefinition>
): SelectOptionType[] {
  if (!colorSets?.length) {
    return [newColorSetOption];
  }
  return [
    newColorSetOption,
    ...colorSets
      .slice()
      .sort(compareByDate)
      .reverse()
      .map(({id, name, brands: brandIds, colors}: ColorSetDefinition) => ({
        value: id,
        label: name || getColorSetName(brandIds, colors, brands),
      })),
  ];
}

type Props = SelectProps & {
  colorSets?: ColorSetDefinition[];
  brands?: Map<number, ColorBrandDefinition>;
  onCreateNewClick?: () => void;
};

export const ColorSetSelect: React.FC<Props> = ({
  colorSets,
  brands,
  onCreateNewClick,
  ...rest
}: Props) => {
  const screens = Grid.useBreakpoint();

  const options = getColorSetOptions(colorSets, brands);
  return (
    <Space.Compact block>
      <Select
        options={options}
        placeholder="Select from your recent color sets"
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
