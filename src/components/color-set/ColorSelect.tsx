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
import {Button, Dropdown, Flex, Grid, Select, Space, Typography} from 'antd';
import type {DefaultOptionType as SelectOptionType} from 'antd/es/select';
import type {MenuProps} from 'antd/lib';
import {useState} from 'react';

import {ColorSquare} from '~/src/components/color/ColorSquare';
import {OpacityIcon} from '~/src/components/color/OpacityIcon';
import {WarmthIcon} from '~/src/components/color/WarmthIcon';
import {filterSelectOptions} from '~/src/components/utils';
import {formatColorLabel} from '~/src/services/color/colors';
import {rgbToOklab} from '~/src/services/color/space/oklab';
import {oklabToOklch} from '~/src/services/color/space/oklch';
import {hexToRgb} from '~/src/services/color/space/rgb';
import type {ColorBrandDefinition, ColorDefinition} from '~/src/services/color/types';
import {degrees} from '~/src/services/math/geometry';
import {
  createExtractorComparator,
  decorateSortUndecorate,
  type ExtractorComparator,
} from '~/src/utils/array';
import {byNumber, reverseOrder} from '~/src/utils/comparator';

enum Sort {
  ById = 1,
  ByHue = 2,
  ByLightness = 3,
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const COLOR_COMPARATORS: Record<Sort, ExtractorComparator<ColorDefinition, any>> = {
  [Sort.ById]: createExtractorComparator<ColorDefinition>(byNumber(({id}) => id)),
  [Sort.ByHue]: createExtractorComparator<ColorDefinition, number>(
    byNumber(d => d),
    ({hex}) => {
      const [, , h] = oklabToOklch(...rgbToOklab(...hexToRgb(hex)));
      return degrees(h);
    }
  ),
  [Sort.ByLightness]: createExtractorComparator<ColorDefinition, number>(
    reverseOrder(byNumber(l => l)),
    ({hex}) => {
      const [l] = rgbToOklab(...hexToRgb(hex));
      return l;
    }
  ),
};

function getColorOptions(
  brand: ColorBrandDefinition,
  colors?: Map<number, ColorDefinition>
): SelectOptionType[] {
  if (!colors?.size) {
    return [];
  }
  return [...colors.values()].map((color: ColorDefinition) => {
    const {hex, opacity, warmth} = color;
    const label: string = formatColorLabel(color, brand);
    return {
      value: color.id,
      label: (
        <Flex key={label} gap="small" align="center">
          <ColorSquare hex={hex} />
          <Typography.Text>{label}</Typography.Text>
          <OpacityIcon opacity={opacity} />
          <WarmthIcon warmth={warmth} />
        </Flex>
      ),
    };
  });
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

  const [sort, setSort] = useState<Sort>();

  const options = getColorOptions(brand, colors);

  let selectedColors: ColorDefinition[] | undefined = value
    ?.map((id: number): ColorDefinition | undefined => colors?.get(id))
    .filter((color): color is ColorDefinition => !!color);

  if (sort) {
    selectedColors = decorateSortUndecorate(selectedColors, COLOR_COMPARATORS[sort]);
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
    {
      key: String(Sort.ById),
      label: t`By ID`,
      onClick: () => {
        setSort(Sort.ById);
      },
    },
    {
      key: String(Sort.ByHue),
      label: t`By hue`,
      onClick: () => {
        setSort(Sort.ByHue);
      },
    },
    {
      key: String(Sort.ByLightness),
      label: t`By lightness`,
      onClick: () => {
        setSort(Sort.ByLightness);
      },
    },
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
        menu={{
          items,
          selectedKeys: [sort ? String(sort) : 'no-sorting'],
        }}
      >
        <Button icon={<SortAscendingOutlined />} style={{height: 'auto'}}>
          {screens.lg && <Trans>Sort</Trans>}
        </Button>
      </Dropdown>
    </Space.Compact>
  );
};
