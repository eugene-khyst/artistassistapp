/**
 * ArtistAssistApp
 * Copyright (C) 2023-2025  Eugene Khyst
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

import {theme, Tooltip} from 'antd';

import type {RgbTuple} from '~/src/services/color/space/rgb';
import {Rgb} from '~/src/services/color/space/rgb';

type Size = 'small' | 'large';

interface Props {
  color: string | RgbTuple;
  size?: Size;
  text?: string | number;
}

export const ColorSquare: React.FC<Props> = ({color, size = 'small', text}: Props) => {
  const {
    token: {fontSize, fontSizeLG, lineHeight},
  } = theme.useToken();
  const isLarge = size === 'large';
  const sideLength: number = isLarge ? 2 * fontSize * lineHeight : fontSizeLG;
  const borderRadius = isLarge ? 8 : 4;
  const rgb = Rgb.fromHexOrTuple(color);
  const hex: string = rgb.toHex();
  return (
    <Tooltip title={hex}>
      <svg width={sideLength} height={sideLength} className="color-icon">
        <rect
          width={sideLength}
          height={sideLength}
          rx={borderRadius}
          fill={hex}
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
