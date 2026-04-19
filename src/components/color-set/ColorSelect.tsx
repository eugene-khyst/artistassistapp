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

import {SortAscendingOutlined} from '@ant-design/icons';
import {Trans, useLingui} from '@lingui/react/macro';
import type {SelectProps} from 'antd';
import {Button, Dropdown, Grid, Select, Space} from 'antd';
import type {DefaultOptionType as SelectOptionType} from 'antd/es/select';
import type {MenuProps} from 'antd/lib';
import {useState} from 'react';

import {ColorLabel} from '~/src/components/color/ColorLabel';
import {COLOR_SORT_LABELS} from '~/src/components/messages';
import {filterSelectOptions} from '~/src/components/utils';
import {
  COLOR_DEFINITION_COMPARATORS,
  ColorSort,
  formatColorLabel,
} from '~/src/services/color/colors';
import type {ColorBrandDefinition, ColorDefinition} from '~/src/services/color/types';
import {decorateSortUndecorate} from '~/src/utils/array';

function getColorOptions(
  brand: ColorBrandDefinition,
  colors?: Map<number, ColorDefinition>
): SelectOptionType[] {
  if (!colors?.size) {
    return [];
  }
  return decorateSortUndecorate(colors.values(), COLOR_DEFINITION_COMPARATORS[ColorSort.ByHue]).map(
    (color: ColorDefinition) => {
      const label = formatColorLabel(color, brand);
      return {
        value: color.id,
        label: <ColorLabel key={label} color={color} brand={brand} label={label} />,
      };
    }
  );
}

type Props = Omit<
  SelectProps<number[]>,
  'options' | 'placeholder' | 'showSearch' | 'allowClear'
> & {
  brand: ColorBrandDefinition;
  colors?: Map<number, ColorDefinition>;
};

export const ColorSelect: React.FC<Props> = ({brand, colors, value, ...rest}: Props) => {
  const screens = Grid.useBreakpoint();

  const {t} = useLingui();

  const [sort, setSort] = useState<ColorSort>();

  const options = getColorOptions(brand, colors);

  let selectedColors: ColorDefinition[] | undefined = value
    ?.map((id: number): ColorDefinition | undefined => colors?.get(id))
    .filter((color): color is ColorDefinition => !!color);

  if (sort) {
    selectedColors = decorateSortUndecorate(selectedColors, COLOR_DEFINITION_COMPARATORS[sort]);
  }

  const selectedIds: number[] | null | undefined = selectedColors?.length
    ? selectedColors.map(({id}) => id)
    : value;

  const items: MenuProps['items'] = [
    {
      key: 'no-sorting',
      label: t`No sorting`,
      onClick: () => {
        setSort(undefined);
      },
    },
    ...[ColorSort.ById, ColorSort.ByHue, ColorSort.ByLightness].map(value => ({
      key: `sort-${value}`,
      label: t(COLOR_SORT_LABELS[value]),
      onClick: () => {
        setSort(value);
      },
    })),
  ];

  return (
    <Space.Compact block>
      <Select
        value={selectedIds}
        options={options}
        placeholder={t`Select colors`}
        showSearch={{filterOption: filterSelectOptions}}
        allowClear
        {...rest}
      />
      <Dropdown
        trigger={['click']}
        menu={{
          items,
          selectedKeys: [sort ? `sort-${sort}` : 'no-sorting'],
        }}
      >
        <Button icon={<SortAscendingOutlined />} style={{height: 'auto'}}>
          {screens.lg && <Trans>Sort</Trans>}
        </Button>
      </Dropdown>
    </Space.Compact>
  );
};
