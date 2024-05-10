/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Space, Tooltip, Typography} from 'antd';

import {OpacityIcon} from '~/src/components/color/OpacityIcon';
import type {Color} from '~/src/services/color';
import {COLOR_BRANDS, formatColorLabel} from '~/src/services/color';

import {ColorSquare} from './ColorSquare';

type Props = {
  color: Color;
  text?: string | number;
};

export const ColorDescription: React.FC<Props> = ({color, text}: Props) => {
  const {type, brand, rgb} = color;
  const {shortName, fullName} = COLOR_BRANDS.get(type)?.get(brand) ?? {};
  return (
    <Space size="small">
      <ColorSquare color={rgb} size="large" text={text} />
      <span>
        <Tooltip title={fullName}>
          <Typography.Text>{shortName || fullName}</Typography.Text>
        </Tooltip>
        <br />
        <Space size="small" align="center">
          <Typography.Text strong>{formatColorLabel(color)}</Typography.Text>
          <OpacityIcon opacity={color.opacity} />
        </Space>
      </span>
    </Space>
  );
};
