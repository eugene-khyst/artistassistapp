/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Cascader, Space, Typography} from 'antd';
import type {CascaderAutoProps, DefaultOptionType as CascaderOptionType} from 'antd/es/cascader';

import {ColorSquare} from '~/src/components/color/ColorSquare';
import {filterCascaderOptions} from '~/src/components/utils';
import type {Color, ColorSet} from '~/src/services/color';
import {formatColorLabel} from '~/src/services/color';
import {useAppStore} from '~/src/stores/app-store';
import {computeIfAbsentInMap} from '~/src/utils';

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
          const label: string = formatColorLabel(color, brand);
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
    })
    .filter((option): option is CascaderOptionType => !!option);
}

type Props = CascaderAutoProps<CascaderOptionType>;

export const ColorCascader: React.FC<Props> = ({multiple, ...rest}: Props) => {
  const colorSet = useAppStore(state => state.colorSet);

  const options = getColorOptions(colorSet);
  return (
    // @ts-expect-error Cascader prop drilling
    <Cascader
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
