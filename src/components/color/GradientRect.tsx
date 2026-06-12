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
import {memo, useId} from 'react';

import styles from './ColorSquare.module.css';

interface Props {
  hexes: string[];
}

export const GradientRect = memo(function GradientRect({hexes}: Readonly<Props>) {
  const {
    token: {fontSizeLG},
  } = theme.useToken();

  const id = useId();

  const height: number = fontSizeLG;
  const width: number = 2 * height;
  const borderRadius = 4;

  if (hexes.length < 2) {
    return null;
  }

  return (
    <svg width={width} height={height} className={styles['icon']}>
      <linearGradient id={id}>
        {hexes.map((hex, index) => (
          <stop
            key={index}
            offset={`${((100 * index) / (hexes.length - 1)).toFixed(2)}%`}
            stopColor={hex}
          />
        ))}
      </linearGradient>

      <rect
        width="100%"
        height="100%"
        rx={borderRadius}
        fill={`url(#${id})`}
        strokeWidth={1}
        stroke="#d9d9d9"
      />
    </svg>
  );
});
