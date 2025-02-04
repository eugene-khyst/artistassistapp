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

import {Cascader, Flex, Typography} from 'antd';
import type {CascaderAutoProps, DefaultOptionType as CascaderOptionType} from 'antd/es/cascader';

import {ColorSquare} from '~/src/components/color/ColorSquare';
import {OpacityIcon} from '~/src/components/color/OpacityIcon';
import {filterCascaderOptions} from '~/src/components/utils';
import {formatColorLabel} from '~/src/services/color/colors';
import type {Color, ColorSet} from '~/src/services/color/types';
import {useAppStore} from '~/src/stores/app-store';
import {computeIfAbsentInMap} from '~/src/utils/map';

const displayRender = (labels: string[]) => labels[labels.length - 1];

function getColorOptions(colorSet?: ColorSet | null): CascaderOptionType[] {
  if (!colorSet) {
    return [];
  }
  const {brands, colors} = colorSet;
  const colorMap = new Map<number, Color[]>();
  colors.forEach((color: Color) =>
    computeIfAbsentInMap(colorMap, color.brand, (): Color[] => []).push(color)
  );
  return [...colorMap.entries()]
    .map(([brandId, colors]: [number, Color[]]): CascaderOptionType | undefined => {
      const brand = brands.get(brandId);
      if (!brand) {
        return;
      }
      return {
        value: brandId,
        label: brand.fullName,
        children: [...colors.values()].map((color: Color) => {
          const {rgb, opacity} = color;
          const label: string = formatColorLabel(color, brand);
          return {
            value: color.id,
            label: (
              <Flex key={label} gap="small" align="center">
                <ColorSquare color={rgb} />
                <Typography.Text>{label}</Typography.Text>
                <OpacityIcon opacity={opacity} />
              </Flex>
            ),
          };
        }),
      };
    })
    .filter((option): option is CascaderOptionType => !!option);
}

type Props = CascaderAutoProps;

export const ColorCascader: React.FC<Props> = ({multiple, ...rest}: Props) => {
  const colorSet = useAppStore(state => state.colorSet);

  const options = getColorOptions(colorSet);
  return (
    // @ts-expect-error Cascader prop drilling
    <Cascader
      options={options}
      placeholder={multiple ? 'Select colors' : 'Select color'}
      showSearch={{filter: filterCascaderOptions}}
      expandTrigger="hover"
      showCheckedStrategy={Cascader.SHOW_CHILD}
      displayRender={displayRender}
      allowClear={!!multiple}
      multiple={multiple}
      {...rest}
    />
  );
};
