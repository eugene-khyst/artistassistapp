/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Cascader, CascaderProps, Space, Typography} from 'antd';
import {PAINT_BRANDS, Paint, PaintBrand, formatPaintLabel} from '~/src/services/color';
import {computeIfAbsentInMap} from '~/src/utils';
import {CascaderOption} from '~/src/components/types';
import {filterCascaderOptions} from '~/src/components/utils';
import {ColorSquare} from './ColorSquare';

const displayRender = (labels: string[]) => labels[labels.length - 1];

function getPaintOptions(paints?: Paint[]): CascaderOption[] {
  if (!paints?.length) {
    return [];
  }
  const paintsMap = new Map();
  paints.forEach((paint: Paint) =>
    computeIfAbsentInMap(paintsMap, paint.brand, () => []).push(paint)
  );
  return [...paintsMap.entries()].map(([brand, paints]: [PaintBrand, Paint[]]) => {
    const {type} = paints[0];
    const {fullName} = PAINT_BRANDS.get(type)?.get(brand) ?? {};
    return {
      value: brand,
      label: fullName,
      children: [...paints.values()].map((paint: Paint) => {
        const label: string = formatPaintLabel(paint);
        return {
          value: paint.id,
          label: (
            <Space size="small" align="center" key={label}>
              <ColorSquare color={paint.rgb} />
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
  paints?: Paint[];
};

export const PaintCascader: React.FC<Props> = ({onChange, paints, multiple, ...rest}: Props) => {
  const options = getPaintOptions(paints);
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
