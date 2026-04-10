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

import {Flex, Typography} from 'antd';
import type React from 'react';

import {ColorSquare} from '~/src/components/color/ColorSquare';
import {OpacityIcon} from '~/src/components/color/OpacityIcon';
import {WarmthIcon} from '~/src/components/color/WarmthIcon';
import {formatColorLabel} from '~/src/services/color/colors';
import {rgbToHex} from '~/src/services/color/space/rgb';
import type {Color, ColorBrandDefinition, ColorDefinition} from '~/src/services/color/types';

interface Props {
  color: ColorDefinition | Color;
  brand: ColorBrandDefinition;
  label?: string;
  showHex?: boolean;
  showBrandName?: boolean;
}

export const ColorLabel: React.FC<Props> = ({
  color,
  brand,
  label,
  showHex = true,
  showBrandName = false,
}: Props) => {
  const {opacity, warmth} = color;
  const hex: string = 'hex' in color ? color.hex : rgbToHex(...color.rgb);
  label ??= formatColorLabel(color, brand);
  const brandName = brand.shortName || brand.fullName;
  return (
    <Flex vertical gap={0}>
      {showBrandName && <Typography.Text type="secondary">{brandName}</Typography.Text>}
      <Flex gap="small" align="center">
        {showHex && <ColorSquare hex={hex} />}
        <Typography.Text>{label}</Typography.Text>
        <OpacityIcon opacity={opacity} />
        <WarmthIcon warmth={warmth} />
      </Flex>
    </Flex>
  );
};
