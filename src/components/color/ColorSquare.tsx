/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {theme, Tooltip} from 'antd';

import type {RgbTuple} from '~/src/services/color/space';
import {Rgb} from '~/src/services/color/space';

type Size = 'small' | 'large';

type Props = {
  color: string | RgbTuple;
  size?: Size;
  text?: string | number;
};

export const ColorSquare: React.FC<Props> = ({color, size = 'small', text}: Props) => {
  const {
    token: {fontSize, fontSizeLG, lineHeight},
  } = theme.useToken();
  const isLarge = size === 'large';
  const sideLength: number = isLarge ? 2 * fontSize * lineHeight : fontSizeLG;
  const borderRadius = isLarge ? 8 : 4;
  const rgb = Rgb.fromHexOrTuple(color);
  const colorHex: string = rgb.toHex();
  return (
    <Tooltip title={colorHex}>
      <svg width={sideLength} height={sideLength} className="color-icon">
        <rect
          width={sideLength}
          height={sideLength}
          rx={borderRadius}
          fill={colorHex}
          strokeWidth={1}
          stroke="#d9d9d9"
        />
        {!!text && (
          <text
            x="50%"
            y="50%"
            dominantBaseline="middle"
            textAnchor="middle"
            fill={rgb.isDark() ? '#fff' : '#000'}
            fontSize={16}
            fontWeight="bold"
          >
            {text}
          </text>
        )}
      </svg>
    </Tooltip>
  );
};
