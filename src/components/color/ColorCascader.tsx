/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import type {CascaderProps} from 'antd';
import {Cascader, Space, Typography} from 'antd';

import type {CascaderOption} from '~/src/components/utils';
import {filterCascaderOptions} from '~/src/components/utils';
import type {Color, ColorBrand} from '~/src/services/color';
import {COLOR_BRANDS, formatColorLabel} from '~/src/services/color';
import {computeIfAbsentInMap} from '~/src/utils';

import {ColorSquare} from './ColorSquare';

const displayRender = (labels: string[]) => labels[labels.length - 1];

function getColorOptions(colors?: Color[]): CascaderOption[] {
  if (!colors?.length) {
    return [];
  }
  const colorMap = new Map<ColorBrand, Color[]>();
  colors.forEach((color: Color) =>
    computeIfAbsentInMap(colorMap, color.brand, (): Color[] => []).push(color)
  );
  return [...colorMap.entries()].map(([brand, colors]: [ColorBrand, Color[]]) => {
    const {type} = colors[0];
    const {fullName} = COLOR_BRANDS.get(type)?.get(brand) ?? {};
    return {
      value: brand,
      label: fullName,
      children: [...colors.values()].map((color: Color) => {
        const label: string = formatColorLabel(color);
        return {
          value: color.id,
          label: (
            <Space size="small" align="center" key={label}>
              <ColorSquare color={color.rgb} />
              <Typography.Text>{label}</Typography.Text>
            </Space>
          ),
        };
      }),
    };
  });
}

type Props = Omit<CascaderProps<CascaderOption>, 'onChange'> & {
  onChange?: (value: (string | number)[] | (string | number)[][]) => void;
  colors?: Color[];
};

export const ColorCascader: React.FC<Props> = ({onChange, colors, multiple, ...rest}: Props) => {
  const options = getColorOptions(colors);
  return (
    <Cascader
      onChange={onChange}
      options={options}
      placeholder="Select color"
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
