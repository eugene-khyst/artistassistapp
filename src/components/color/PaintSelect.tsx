/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Select, SelectProps, Space, Typography} from 'antd';
import {Paint, formatPaintLabel} from '~/src/services/color';
import {filterSelectOptions} from '~/src/components/utils';
import {ColorSquare} from './ColorSquare';

function getPaintOptions(paints?: Map<number, Paint>): SelectProps['options'] {
  if (!paints?.size) {
    return [];
  }
  return [...paints.values()].map((paint: Paint) => {
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
  });
}

type Props = SelectProps & {
  paints?: Map<number, Paint>;
};

export const PaintSelect: React.FC<Props> = ({paints, ...rest}: Props) => {
  const options = getPaintOptions(paints);
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
