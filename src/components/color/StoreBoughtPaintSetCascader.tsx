/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Cascader, CascaderProps} from 'antd';
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

type Props = Omit<CascaderProps<CascaderOption>, 'onChange'> & {
  onChange?: (value: (string | number)[] | (string | number)[][]) => void;
  type?: PaintType;
  storeBoughtPaintSets: Map<PaintBrand, Map<string, StoreBoughtPaintSet>>;
};

export const StoreBoughtPaintSetCascader: React.FC<Props> = ({
  onChange,
  type,
  storeBoughtPaintSets,
  ...rest
}: Props) => {
  const options = getStoreBoughtPaintSetOptions(type, storeBoughtPaintSets);
  return (
    <Cascader
      onChange={onChange}
      options={options}
      placeholder="Select set"
      showSearch={{filter: filterCascaderOptions}}
      expandTrigger="hover"
      allowClear
      {...rest}
    />
  );
};
