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

import {ColorSetName} from '@/components/color-set/ColorSetName';
import {filterSelectOptions} from '@/components/utils';
import {colorSetDefinitionToBrandColorCounts} from '@/services/color/colors';
import type {ColorBrandDefinition, ColorSetDefinition} from '@/services/color/types';
import {byDate, reverseOrder} from '@/utils/comparator';

const showSearch = {filterOption: filterSelectOptions};

const newColorSetOption: SelectOptionType = {
  value: 0,
  label: (
    <>
      <PlusOutlined />{' '}
      <Typography.Text>
        <Trans>New color set</Trans>
      </Typography.Text>
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
      .sort(reverseOrder(byDate(({date}) => date)))
      .map((colorSet: ColorSetDefinition) => {
        if (colorSet.name) {
          return {value: colorSet.id, label: colorSet.name};
        }
        const brandColorCounts = colorSetDefinitionToBrandColorCounts(colorSet, brands);
        const key = brandColorCounts
          .map(({brandName, colorCount}) => `${brandName} ${colorCount}`)
          .join(' ');
        return {
          value: colorSet.id,
          label: <ColorSetName key={key} brandColorCounts={brandColorCounts} />,
        };
      }),
  ];
}

type Props = Omit<SelectProps, 'options' | 'placeholder' | 'showSearch'> & {
  colorSets?: ColorSetDefinition[];
  brands?: Map<number, ColorBrandDefinition>;
  onCreateNewClick?: () => void;
};

export function ColorSetSelect({colorSets, brands, onCreateNewClick, ...rest}: Readonly<Props>) {
  const screens = Grid.useBreakpoint();

  const {t} = useLingui();

  const options = useMemo(() => getColorSetOptions(colorSets, brands), [colorSets, brands]);

  return (
    <Space.Compact block>
      <Select
        options={options}
        placeholder={t`Select from your recent color sets`}
        showSearch={showSearch}
        {...rest}
      />
      <Button icon={<PlusOutlined />} onClick={onCreateNewClick}>
        {screens.sm && t`Create new`}
      </Button>
    </Space.Compact>
  );
}
