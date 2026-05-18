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
import {Cascader} from 'antd';
import type {CascaderProps, DefaultOptionType} from 'antd/es/cascader';
import {useMemo} from 'react';

import {ColorLabel} from '~/src/components/color/ColorLabel';
import {filterCascaderOptions} from '~/src/components/utils';
import {COLOR_COMPARATORS, ColorSort, formatColorLabel} from '~/src/services/color/colors';
import type {Color, ColorId, ColorSet} from '~/src/services/color/types';
import {useAppStore} from '~/src/stores/app-store';
import {decorateSortUndecorate} from '~/src/utils/array';
import {computeIfAbsentInMap} from '~/src/utils/map';

type OptionType = Omit<DefaultOptionType, 'value'> & {value?: number | null};

const displayRender = (labels: string[]) => labels[labels.length - 1];
const showSearch = {filter: filterCascaderOptions};
const classNames = {popup: {root: 'color-cascader'}};

function getColorOptions(colorSet: ColorSet | null): OptionType[] {
  if (!colorSet) {
    return [];
  }
  const {brands, colors} = colorSet;
  const colorMap = new Map<number, Color[]>();
  colors.forEach((color: Color) =>
    computeIfAbsentInMap(colorMap, color.brand, (): Color[] => []).push(color)
  );
  return [...colorMap.entries()]
    .map(([brandId, colors]: [number, Color[]]): OptionType | undefined => {
      const brand = brands.get(brandId);
      if (!brand) {
        return;
      }
      return {
        value: brandId,
        label: brand.fullName,
        children: decorateSortUndecorate(colors, COLOR_COMPARATORS[ColorSort.ByHue]).map(
          (color: Color) => {
            const label = formatColorLabel(color, brand);
            return {
              value: color.id,
              label: <ColorLabel key={label} color={color} brand={brand} label={label} />,
            };
          }
        ),
      };
    })
    .filter((option): option is OptionType => !!option);
}

type ColorCascaderBaseProps = Omit<
  CascaderProps<OptionType, 'value', false>,
  | 'options'
  | 'placeholder'
  | 'showSearch'
  | 'expandTrigger'
  | 'showCheckedStrategy'
  | 'displayRender'
  | 'multiple'
  | 'value'
  | 'onChange'
> & {
  multiple?: boolean;
};

type ColorCascaderSingleProps = ColorCascaderBaseProps & {
  multiple?: false;
  value?: ColorId;
  onChange?: (value: ColorId, selectOptions: OptionType[]) => void;
};

type ColorCascaderMultipleProps = ColorCascaderBaseProps & {
  multiple: true;
  value?: ColorId[];
  onChange?: (value: ColorId[], selectOptions: OptionType[][]) => void;
};

type ColorCascaderProps = ColorCascaderSingleProps | ColorCascaderMultipleProps;

export function ColorCascader({
  multiple,
  allowClear,
  value,
  onChange,
  ...rest
}: Readonly<ColorCascaderProps>) {
  const colorSet = useAppStore(state => state.colorSet);

  const {t} = useLingui();

  const options = useMemo(() => getColorOptions(colorSet), [colorSet]);

  return (
    // @ts-expect-error Cascader prop drilling
    <Cascader<OptionType>
      options={options}
      placeholder={multiple ? t`Select colors` : t`Select color`}
      showSearch={showSearch}
      expandTrigger="hover"
      showCheckedStrategy={Cascader.SHOW_CHILD}
      displayRender={displayRender}
      allowClear={allowClear ?? !!multiple}
      multiple={multiple}
      value={value}
      onChange={onChange}
      classNames={classNames}
      {...rest}
    />
  );
}
