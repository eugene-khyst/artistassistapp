/**
 * ArtistAssistApp
 * Copyright (C) 2023-2026  Eugene Khyst
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

import {theme} from 'antd';
import {memo} from 'react';

import type {RgbTuple} from '@/services/color/space/rgb';
import {hexToRgb, isRgbDark, toHexString} from '@/services/color/space/rgb';

import styles from './ColorSquare.module.css';

type Size = 'small' | 'large';

interface Props {
  hex: string | null;
  size?: Size;
  text?: string | number;
}

export const ColorSquare = memo(function ColorSquare({hex, size = 'small', text}: Readonly<Props>) {
  const {
    token: {fontSize, fontSizeLG, lineHeight},
  } = theme.useToken();

  const isLarge: boolean = size === 'large';
  const sideLength: number = isLarge ? 2 * fontSize * lineHeight : fontSizeLG;
  const borderRadius: number = isLarge ? 8 : 4;

  if (!hex) {
    const halfBorderRadius = borderRadius / 2;
    return (
      <svg width={sideLength} height={sideLength} className={styles['icon']}>
        <rect
          width="100%"
          height="100%"
          rx={borderRadius}
          fill="#fff"
          strokeWidth={1}
          stroke="#d9d9d9"
        />
        <line
          x1={sideLength - halfBorderRadius}
          y1={halfBorderRadius}
          x2={halfBorderRadius}
          y2={sideLength - halfBorderRadius}
          stroke="#f00"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  const rgb: RgbTuple = hexToRgb(hex);
  const hexString: string = toHexString(hex);
  return (
    <svg width={sideLength} height={sideLength} className={styles['icon']}>
      <rect
        width="100%"
        height="100%"
        rx={borderRadius}
        fill={hexString}
        strokeWidth={1}
        stroke="#d9d9d9"
      />
      {!!text && (
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          fill={isRgbDark(...rgb) ? '#fff' : '#000'}
          fontSize={16}
          fontWeight="bold"
        >
          {text}
        </text>
      )}
    </svg>
  );
});
