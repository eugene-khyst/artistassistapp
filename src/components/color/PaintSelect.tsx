/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Select, SelectProps, Space} from 'antd';
import {CSSProperties} from 'react';
import {Paint, formatPaintLabel} from '../../services/color';
import {filterSelectOptions} from '../utils';
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
          <span>{label}</span>
        </Space>
      ),
    };
  });
}

type Props = {
  value?: number[];
  onChange?: (value: number[]) => void;
  paints?: Map<number, Paint>;
  mode?: 'multiple';
  loading?: boolean;
  style?: CSSProperties;
};

export const PaintSelect: React.FC<Props> = ({
  value,
  onChange,
  paints,
  mode,
  loading,
  style,
}: Props) => {
  const options = getPaintOptions(paints);
  return (
    <Select
      value={value}
      onChange={onChange}
      mode={mode}
      options={options}
      placeholder="Select colors"
      showSearch
      filterOption={filterSelectOptions}
      allowClear
      loading={loading}
      style={style}
    />
  );
};
