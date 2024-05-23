/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {QuestionCircleOutlined} from '@ant-design/icons';
import {Space, theme, Tooltip, Typography} from 'antd';
import type {ReactNode} from 'react';

import {ColorType, isThickConsistency} from '~/src/services/color';
import {formatFraction, formatRatio, type Fraction} from '~/src/utils';

type ConsistencyDescriptionConfig = {
  labelRender: (fraction: Fraction) => ReactNode;
  tooltip: string;
};

const DILUTED_IN_WATER = (fraction: Fraction) => (
  <Typography.Text>Dilute the paint with water in a {formatRatio(fraction)} ratio</Typography.Text>
);
const LAYER_THIKNESS = (fraction: Fraction) => (
  <Typography.Text>Thin the paint to {formatFraction(fraction)} thickness</Typography.Text>
);
const PRESSURE = (fraction: Fraction) => (
  <Typography.Text>Lighten the pressure to {formatFraction(fraction)}</Typography.Text>
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

type Props = {
  colorType: ColorType;
  consistency: Fraction;
  showTooltip?: boolean;
};

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
    !isThickConsistency({consistency}) && (
      <Space size="small">
        {labelRender(consistency)}
        {tooltip && showTooltip && (
          <Tooltip title={tooltip}>
            <QuestionCircleOutlined style={{color: colorTextTertiary, cursor: 'help'}} />
          </Tooltip>
        )}
      </Space>
    )
  );
};
