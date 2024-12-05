/**
 * ArtistAssistApp
 * Copyright (C) 2023-2024  Eugene Khyst
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

type Props = CascaderAutoProps & {
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
      {...rest}
    />
  );
};
