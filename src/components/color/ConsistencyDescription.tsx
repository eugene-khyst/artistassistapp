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

import {QuestionCircleOutlined} from '@ant-design/icons';
import {Space, theme, Tooltip, Typography} from 'antd';
import type {ReactNode} from 'react';

import {isThickConsistency} from '~/src/services/color/color-mixer';
import {ColorType} from '~/src/services/color/types';
import {formatFraction, formatRatio} from '~/src/utils/format';
import type {Fraction} from '~/src/utils/fraction';

interface ConsistencyDescriptionConfig {
  labelRender: (fraction: Fraction) => ReactNode;
  tooltip: string;
}

const DILUTED_IN_WATER = (fraction: Fraction) => (
  <Typography.Text>
    Dilute the paint with water in a{' '}
    <Typography.Text strong>{formatRatio(fraction)} ratio</Typography.Text>
  </Typography.Text>
);
const LAYER_THIKNESS = (fraction: Fraction) => (
  <Typography.Text>
    Thin the paint to <Typography.Text strong>{formatFraction(fraction)} thickness</Typography.Text>
  </Typography.Text>
);
const PRESSURE = (fraction: Fraction) => (
  <Typography.Text>
    Lighten the pressure to <Typography.Text strong>{formatFraction(fraction)}</Typography.Text>
  </Typography.Text>
);

const CONSISTENCIES: Partial<Record<ColorType, ConsistencyDescriptionConfig>> = {
  [ColorType.WatercolorPaint]: {
    labelRender: DILUTED_IN_WATER,
    tooltip: 'Watercolor can be diluted with water to make it more transparent.',
  },
  [ColorType.OilPaint]: {
    labelRender: LAYER_THIKNESS,
    tooltip:
      'Use glazing mediums that allow you to get a thin layer, for example, 1/10 of the original oil paint layer. You should be able to get the consistency of runny sour cream. Linseed oil is a popular glazing medium.',
  },
  [ColorType.AcrylicPaint]: {
    labelRender: LAYER_THIKNESS,
    tooltip:
      'Use glazing mediums that allow you to get a thin layer, for example, 1/10 of the original acrylic paint layer.',
  },
  [ColorType.ColoredPencils]: {
    labelRender: PRESSURE,
    tooltip: 'Apply less pressure to make the colored pencil layer more transparent',
  },
  [ColorType.WatercolorPencils]: {
    labelRender: PRESSURE,
    tooltip: 'Apply less pressure to make the watercolor pencil layer more transparent',
  },
};

interface Props {
  colorType: ColorType;
  consistency: Fraction;
  showTooltip?: boolean;
}

export const ConsistencyDescription: React.FC<Props> = ({
  colorType,
  consistency,
  showTooltip = true,
}: Props) => {
  const {
    token: {colorTextTertiary},
  } = theme.useToken();

  const {labelRender, tooltip} = CONSISTENCIES[colorType] ?? {};
  return (
    labelRender &&
    (isThickConsistency({consistency}) ? (
      <Space size={4}>
        <Typography.Text>Thick pigment</Typography.Text>
        {showTooltip && (
          <Tooltip title="Don't thin the layer">
            <QuestionCircleOutlined style={{color: colorTextTertiary, cursor: 'help'}} />
          </Tooltip>
        )}
      </Space>
    ) : (
      <Space size={4}>
        {labelRender(consistency)}
        {tooltip && showTooltip && (
          <Tooltip title={tooltip}>
            <QuestionCircleOutlined style={{color: colorTextTertiary, cursor: 'help'}} />
          </Tooltip>
        )}
      </Space>
    ))
  );
};
