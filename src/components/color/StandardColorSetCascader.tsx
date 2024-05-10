/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import type {CascaderProps} from 'antd';
import {Cascader} from 'antd';

import type {CascaderOption} from '~/src/components/utils';
import {filterCascaderOptions} from '~/src/components/utils';
import type {ColorBrand, ColorType, StandardColorSet} from '~/src/services/color';
import {COLOR_BRANDS} from '~/src/services/color';

const CUSTOM_COLOR_SET_OPTION = {
  value: 0,
  label: 'Custom color set',
};

function getStandardColorSetOptions(
  type: ColorType | undefined,
  standardColorSetMap: Map<ColorBrand, Map<string, StandardColorSet>>
): CascaderOption[] {
  if (!type || !standardColorSetMap.size) {
    return [];
  }
  return [
    CUSTOM_COLOR_SET_OPTION,
    ...[...standardColorSetMap.entries()].map(
      ([brand, standardColorSets]: [ColorBrand, Map<string, StandardColorSet>]) => {
        const {fullName} = COLOR_BRANDS.get(type)?.get(brand) ?? {};
        return {
          value: brand,
          label: fullName,
          children: [...standardColorSets.values()].map(({name}: StandardColorSet) => ({
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
  type?: ColorType;
  standardColorSets: Map<ColorBrand, Map<string, StandardColorSet>>;
};

export const StandardColorSetCascader: React.FC<Props> = ({
  onChange,
  type,
  standardColorSets,
  ...rest
}: Props) => {
  const options = getStandardColorSetOptions(type, standardColorSets);
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
