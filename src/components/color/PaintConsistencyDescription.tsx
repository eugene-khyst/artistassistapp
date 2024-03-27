/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {QuestionCircleOutlined} from '@ant-design/icons';
import {Space, Tooltip, Typography, theme} from 'antd';
import {ReactNode} from 'react';
import {PaintConsistency, PaintType} from '~/src/services/color';

type ConsistencyDescription = {
  labelRender: (consistency: PaintConsistency) => ReactNode;
  tooltip: string;
};

const DILUTED_IN_WATER = ([paint, fluid]: PaintConsistency) => (
  <>
    <Typography.Text>Consistency:</Typography.Text>
    <Typography.Text>
      {paint} paint : {fluid} water
    </Typography.Text>
  </>
);
const LAYER_THIKNESS = ([paint, fluid]: PaintConsistency) => (
  <>
    <Typography.Text>Layer thikness:</Typography.Text>
    <Typography.Text>
      {paint}/{paint + fluid}
    </Typography.Text>
  </>
);
const PRESSURE = ([paint, fluid]: PaintConsistency) => (
  <>
    <Typography.Text>Pressure:</Typography.Text>
    <Typography.Text>
      {paint}/{paint + fluid}
    </Typography.Text>
  </>
);

const CONSISTENCIES: Record<PaintType, ConsistencyDescription> = {
  [PaintType.WatercolorPaint]: {
    labelRender: DILUTED_IN_WATER,
    tooltip: 'Watercolor can be diluted with water to make it more transparent.',
  },
  [PaintType.OilPaint]: {
    labelRender: LAYER_THIKNESS,
    tooltip:
      'Use glazing mediums that allow you to get a thin layer, for example, 1/10 of the original oil paint layer. You should be able to get the consistency of runny sour cream. Linseed oil is a popular glazing medium.',
  },
  [PaintType.AcrylicPaint]: {
    labelRender: LAYER_THIKNESS,
    tooltip:
      'Use glazing mediums that allow you to get a thin layer, for example, 1/10 of the original acrylic paint layer.',
  },
  [PaintType.ColoredPencils]: {
    labelRender: PRESSURE,
    tooltip: 'Apply less pressure to make the colored pencil layer more transparent',
  },
  [PaintType.WatercolorPencils]: {
    labelRender: PRESSURE,
    tooltip: 'Apply less pressure to make the watercolor pencil layer more transparent',
  },
};

type Props = {
  paintType: PaintType;
  consistency: PaintConsistency;
};

export const PaintConsistencyDescription: React.FC<Props> = ({paintType, consistency}: Props) => {
  const {
    token: {colorTextTertiary},
  } = theme.useToken();

  const [_, fluid] = consistency;

  return (
    fluid !== 0 &&
    CONSISTENCIES[paintType] && (
      <Space size="small">
        {CONSISTENCIES[paintType].labelRender(consistency)}
        <Tooltip title={CONSISTENCIES[paintType].tooltip}>
          <QuestionCircleOutlined style={{color: colorTextTertiary, cursor: 'help'}} />
        </Tooltip>
      </Space>
    )
  );
};
