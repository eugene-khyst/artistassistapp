/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import type {SelectProps} from 'antd';
import {Select, Space, Typography} from 'antd';

import {filterSelectOptions} from '~/src/components/utils';
import type {Color} from '~/src/services/color';
import {formatColorLabel} from '~/src/services/color';

import {ColorSquare} from './ColorSquare';

function getColorOptions(colors?: Map<number, Color>): SelectProps['options'] {
  if (!colors?.size) {
    return [];
  }
  return [...colors.values()].map((color: Color) => {
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
  });
}

type Props = SelectProps & {
  colors?: Map<number, Color>;
};

export const ColorSelect: React.FC<Props> = ({colors, ...rest}: Props) => {
  const options = getColorOptions(colors);
  return (
    <Select
      options={options}
      placeholder="Select colors"
      showSearch
      filterOption={filterSelectOptions}
      allowClear
      {...rest}
    />
  );
};
