/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Cascader} from 'antd';
import type {CascaderAutoProps, DefaultOptionType as CascaderOptionType} from 'antd/es/cascader';

import {filterCascaderOptions} from '~/src/components/utils';
import type {ColorBrandDefinition, StandardColorSetDefinition} from '~/src/services/color';

const CUSTOM_COLOR_SET_OPTION: CascaderOptionType = {
  value: 0,
  label: 'Custom color set',
};

function getStandardColorSetOptions(
  brands?: ColorBrandDefinition[],
  standardColorSetMap?: Map<string, Map<string, StandardColorSetDefinition>>
): CascaderOptionType[] {
  if (!brands?.length || !standardColorSetMap?.size) {
    return [];
  }
  return [
    CUSTOM_COLOR_SET_OPTION,
    ...brands
      .map(({id, alias, fullName}: ColorBrandDefinition): CascaderOptionType | undefined => {
        const standardColorSets = standardColorSetMap.get(alias);
        if (!standardColorSets) {
          return;
        }
        return {
          value: id,
          label: fullName,
          children: [...standardColorSets.values()].map(({name}: StandardColorSetDefinition) => ({
            value: name,
            label: name,
          })),
        };
      })
      .filter((option): option is CascaderOptionType => !!option),
  ];
}

type Props = CascaderAutoProps<CascaderOptionType> & {
  brands?: ColorBrandDefinition[];
  standardColorSets?: Map<string, Map<string, StandardColorSetDefinition>>;
};

export const StandardColorSetCascader: React.FC<Props> = ({
  onChange,
  brands,
  standardColorSets,
  ...rest
}: Props) => {
  const options = getStandardColorSetOptions(brands, standardColorSets);
  return (
    // @ts-expect-error Cascader prop drilling
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
