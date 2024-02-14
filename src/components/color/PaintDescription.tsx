/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Space, Tooltip} from 'antd';
import {PAINT_BRANDS, Paint} from '../../services/color';
import {ColorSquare} from './ColorSquare';

type Props = {
  paint: Paint;
  text?: string | number;
};

export const PaintDescription: React.FC<Props> = ({paint, text}: Props) => {
  const {type, brand, id, name, rgb} = paint;
  const {shortName, fullName} = PAINT_BRANDS.get(type)?.get(brand) ?? {};
  return (
    <Space size="small">
      <ColorSquare color={rgb} size="large" text={text} />
      <span>
        <Tooltip title={fullName}>
          <i>{shortName || fullName}</i>
        </Tooltip>
        <br />
        <b>{id < 1000 ? `${String(id).padStart(3, '0')} ${name}` : name}</b>
      </span>
    </Space>
  );
};
