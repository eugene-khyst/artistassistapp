/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Cascader} from 'antd';
import {CSSProperties} from 'react';
import {PAINT_BRANDS, PaintBrand, PaintType, StoreBoughtPaintSet} from '../../services/color';
import {CascaderOption} from '../types';
import {filterCascaderOptions} from '../utils';

const CUSTOM_PAINT_SET_OPTION = {
  value: 0,
  label: 'Custom paint set',
};

function getStoreBoughtPaintSetOptions(
  type: PaintType | undefined,
  storeBoughtPaintSets: Map<PaintBrand, Map<string, StoreBoughtPaintSet>>
): CascaderOption[] {
  if (!type || !storeBoughtPaintSets.size) {
    return [];
  }
  return [
    CUSTOM_PAINT_SET_OPTION,
    ...[...storeBoughtPaintSets.entries()].map(
      ([brand, storeBoughtPaintSets]: [PaintBrand, Map<string, StoreBoughtPaintSet>]) => {
        const {fullName} = PAINT_BRANDS.get(type)?.get(brand) ?? {};
        return {
          value: brand,
          label: fullName,
          children: [...storeBoughtPaintSets.values()].map(({name}: StoreBoughtPaintSet) => ({
            value: name,
            label: name,
          })),
        };
      }
    ),
  ];
}

type Props = {
  value?: (number | string)[];
  onChange?: (value: (number | string)[]) => void;
  type?: PaintType;
  storeBoughtPaintSets: Map<PaintBrand, Map<string, StoreBoughtPaintSet>>;
  loading?: boolean;
  style?: CSSProperties;
};

export const StoreBoughtPaintSetCascader: React.FC<Props> = ({
  value,
  onChange,
  type,
  storeBoughtPaintSets,
  loading,
  style,
}: Props) => {
  const options = getStoreBoughtPaintSetOptions(type, storeBoughtPaintSets);
  return (
    <Cascader
      value={value}
      onChange={onChange}
      options={options}
      placeholder="Select set"
      showSearch={{filter: filterCascaderOptions}}
      expandTrigger="hover"
      allowClear
      loading={loading}
      style={style}
    />
  );
};
