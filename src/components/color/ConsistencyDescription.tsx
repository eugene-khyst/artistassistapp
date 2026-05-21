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

import {QuestionCircleOutlined} from '@ant-design/icons';
import type {MessageDescriptor} from '@lingui/core';
import {defineMessage} from '@lingui/core/macro';
import {Trans, useLingui} from '@lingui/react/macro';
import {Space, Tooltip, Typography} from 'antd';
import type {ReactNode} from 'react';

import {isFullStrength} from '~/src/services/color/color-mixer';
import {ColorType} from '~/src/services/color/types';
import {formatFraction, formatRatio} from '~/src/utils/format';
import type {Fraction} from '~/src/utils/fraction';

interface ConsistencyDescriptionConfig {
  fullStrength: {
    label: MessageDescriptor;
    tooltip: MessageDescriptor;
  };
  transparent: {
    labelRender: (fraction: Fraction) => ReactNode;
    tooltip: MessageDescriptor;
  };
}

const fullStrength: ConsistencyDescriptionConfig['fullStrength'] = {
  label: defineMessage`Full strength`,
  tooltip: defineMessage`Use at full strength.`,
};

const fullPressure: ConsistencyDescriptionConfig['fullStrength'] = {
  label: defineMessage`Full pressure`,
  tooltip: defineMessage`Use full pressure.`,
};

const denseLayer: ConsistencyDescriptionConfig['fullStrength'] = {
  label: defineMessage`Dense layer`,
  tooltip: defineMessage`Apply densely.`,
};

const dilutedInWater = (fraction: Fraction) => {
  const ratioText: string = formatRatio(fraction);
  return (
    <Typography.Text>
      <Trans>
        Dilute the paint with water in a <Typography.Text strong>{ratioText} ratio</Typography.Text>
      </Trans>
    </Typography.Text>
  );
};

const layerThickness = (fraction: Fraction) => {
  const fractionText: string = formatFraction(fraction);
  return (
    <Typography.Text>
      <Trans>
        Thin the paint to <Typography.Text strong>{fractionText} thickness</Typography.Text>
      </Trans>
    </Typography.Text>
  );
};

const pressure = (fraction: Fraction) => {
  const fractionText = formatFraction(fraction);
  return (
    <Typography.Text>
      <Trans>
        Lighten the pressure to <Typography.Text strong>{fractionText}</Typography.Text>
      </Trans>
    </Typography.Text>
  );
};

const strokes = (fraction: Fraction) => {
  const ratioText = formatRatio(fraction);
  return (
    <Typography.Text>
      <Trans>
        Apply strokes of each color in a <Typography.Text strong>{ratioText} ratio</Typography.Text>
      </Trans>
    </Typography.Text>
  );
};

const DESCRIPTIONS: Partial<Record<ColorType, ConsistencyDescriptionConfig>> = {
  [ColorType.WatercolorPaint]: {
    fullStrength: fullStrength,
    transparent: {
      labelRender: dilutedInWater,
      tooltip: defineMessage`Watercolor can be diluted with water to make it more transparent.`,
    },
  },
  [ColorType.OilPaint]: {
    fullStrength: fullStrength,
    transparent: {
      labelRender: layerThickness,
      tooltip: defineMessage`Use glazing mediums that allow you to get a thin layer, for example, 1/10 of the original oil paint layer. You should be able to get the consistency of runny sour cream. Linseed oil is a popular glazing medium.`,
    },
  },
  [ColorType.AcrylicPaint]: {
    fullStrength: fullStrength,
    transparent: {
      labelRender: layerThickness,
      tooltip: defineMessage`Use glazing mediums that allow you to get a thin layer, for example, 1/10 of the original acrylic paint layer.`,
    },
  },
  [ColorType.ColoredPencils]: {
    fullStrength: fullPressure,
    transparent: {
      labelRender: pressure,
      tooltip: defineMessage`Apply less pressure to make the colored pencil layer more transparent.`,
    },
  },
  [ColorType.WatercolorPencils]: {
    fullStrength: fullPressure,
    transparent: {
      labelRender: pressure,
      tooltip: defineMessage`Apply less pressure to make the watercolor pencil layer more transparent.`,
    },
  },
  [ColorType.DryPastel]: {
    fullStrength: denseLayer,
    transparent: {
      labelRender: strokes,
      tooltip: defineMessage`Slightly overlap pastel areas of different colors and blend gently to create a smooth transition.`,
    },
  },
  [ColorType.OilPastel]: {
    fullStrength: denseLayer,
    transparent: {
      labelRender: strokes,
      tooltip: defineMessage`Slightly overlap oil pastel areas of different colors and blend gently to create a smooth transition.`,
    },
  },
  [ColorType.WaxPastel]: {
    fullStrength: denseLayer,
    transparent: {
      labelRender: strokes,
      tooltip: defineMessage`Slightly overlap wax pastel areas of different colors and blend firmly to create a smooth transition.`,
    },
  },
};

interface Props {
  colorType: ColorType;
  consistency: Fraction;
  showTooltip?: boolean;
}

export function ConsistencyDescription({
  colorType,
  consistency,
  showTooltip = true,
}: Readonly<Props>) {
  const {t} = useLingui();

  const config = DESCRIPTIONS[colorType];
  if (!config) {
    return null;
  }
  const {fullStrength, transparent} = config;

  return isFullStrength({consistency}) ? (
    <Space size={4}>
      <Typography.Text>{t(fullStrength.label)}</Typography.Text>
      {showTooltip && (
        <Tooltip title={t(fullStrength.tooltip)}>
          <QuestionCircleOutlined className="u-help-icon" />
        </Tooltip>
      )}
    </Space>
  ) : (
    <Space size={4}>
      {transparent.labelRender(consistency)}
      {showTooltip && (
        <Tooltip title={t(transparent.tooltip)}>
          <QuestionCircleOutlined className="u-help-icon" />
        </Tooltip>
      )}
    </Space>
  );
}
