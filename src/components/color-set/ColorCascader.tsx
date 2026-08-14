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

import {
  type Color,
  COLOR_COMPARATORS,
  type ColorId,
  type ColorSet,
  ColorSort,
  computeIfAbsentInMap,
  decorateSortUndecorate,
  includesColorId,
} from '@eugene-khyst/artistassistapp-color-mixer';
import {Trans} from '@lingui/react/macro';
import {Cascader} from 'antd';
import type {CascaderProps, DefaultOptionType} from 'antd/es/cascader';
import {useMemo} from 'react';

import {ColorLabel} from '@/components/color/ColorLabel';
import {filterCascaderOptions} from '@/components/utils';
import {formatColorLabel} from '@/services/color/colors';
import {useAppStore} from '@/stores/app-store';

import styles from './ColorCascader.module.css';

type OptionType = Omit<DefaultOptionType, 'value' | 'children'> & {
  value?: number | null;
  children?: OptionType[];
};

const displayRender = (labels: string[]) => labels[labels.length - 1];
const showSearch = {filter: filterCascaderOptions};
const classNames = {popup: {root: styles['popup']}};

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

function disableColors(
  options: OptionType[],
  disabledColorIds: readonly ColorId[],
  currentColorIds?: readonly ColorId[]
): OptionType[] {
  const brandOptions = options.map((brandOption: OptionType): OptionType => {
    const children = brandOption.children?.map((colorOption: OptionType): OptionType => {
      const colorId: ColorId = [brandOption.value!, colorOption.value!];
      const disabled =
        includesColorId(disabledColorIds, colorId) && !includesColorId(currentColorIds, colorId);
      return disabled === !!colorOption['disabled'] ? colorOption : {...colorOption, disabled};
    });
    const disabled = !!children?.length && children.every(child => !!child['disabled']);
    return children?.some((child, i) => child !== brandOption.children?.[i]) ||
      disabled !== !!brandOption['disabled']
      ? {...brandOption, children, disabled}
      : brandOption;
  });
  return brandOptions.some((brandOption, i) => brandOption !== options[i]) ? brandOptions : options;
}

type ColorCascaderBaseProps = Omit<
  CascaderProps<OptionType, 'value', false>,
  | 'options'
  | 'showSearch'
  | 'expandTrigger'
  | 'showCheckedStrategy'
  | 'displayRender'
  | 'multiple'
  | 'value'
  | 'onChange'
> & {
  multiple?: boolean;
  disabledColorIds?: readonly ColorId[];
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

const EMPTY_COLOR_IDS: readonly ColorId[] = [];

export function ColorCascader({
  multiple,
  allowClear,
  value,
  onChange,
  disabledColorIds = EMPTY_COLOR_IDS,
  placeholder,
  ...rest
}: Readonly<ColorCascaderProps>) {
  const colorSet = useAppStore(state => state.colorSet);

  const options = useMemo(() => getColorOptions(colorSet), [colorSet]);

  const cascaderOptions = useMemo(
    () =>
      disabledColorIds.length
        ? disableColors(options, disabledColorIds, multiple ? value : value ? [value] : undefined)
        : options,
    [options, disabledColorIds, multiple, value]
  );

  return (
    // @ts-expect-error Cascader prop drilling
    <Cascader<OptionType>
      options={cascaderOptions}
      placeholder={
        placeholder ?? (multiple ? <Trans>Select colors</Trans> : <Trans>Select color</Trans>)
      }
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
