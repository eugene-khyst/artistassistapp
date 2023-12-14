/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {QuestionCircleOutlined} from '@ant-design/icons';
import {Space, Tooltip, theme} from 'antd';
import {PaintFraction, PaintMix, PaintType} from '../../services/color';
import {ColorSquare} from './ColorSquare';
import {PaintDescription} from './PaintDescription';

const CONSISTENCY_TOOLTIPS = {
  [PaintType.Watercolor]: 'Watercolor can be diluted with water to make it more transparent.',
  [PaintType.OilPaint]:
    'Use glazing mediums that allow you to get a thin layer, for example, 1/10 of the original oil paint layer. You should be able to get the consistency of runny sour cream. Linseed oil is a popular glazing medium.',
  [PaintType.AcrylicPaint]:
    'Use glazing mediums that allow you to get a thin layer, for example, 1/10 of the original acrylic paint layer.',
};

type Props = {
  paintMix: PaintMix;
  showConsistency?: boolean;
};

export const PaintMixDescription: React.FC<Props> = ({
  paintMix: {type, fractions, paintMixRgb, backgroundRgb, consistency, paintMixLayerRgb},
  showConsistency = true,
}: Props) => {
  const {
    token: {colorTextTertiary},
  } = theme.useToken();
  const [paintFraction, fluidFraction] = consistency;

  return (
    <Space direction="vertical" size="small">
      {fractions.length > 1 && (
        <Space size="small">
          Ratios: {fractions.map(({fraction}: PaintFraction) => fraction).join(' : ')}
        </Space>
      )}
      <Space size="small">
        {fractions.length > 1 ? (
          <>
            <Space direction="vertical" size="small">
              {fractions.map(({paint, fraction}: PaintFraction, i: number) => {
                return <PaintDescription key={i} paint={paint} text={fraction} />;
              })}
            </Space>
            =
            <ColorSquare color={paintMixRgb} size="large" />
          </>
        ) : (
          <PaintDescription paint={fractions[0].paint} />
        )}
      </Space>
      {showConsistency && fluidFraction !== 0 && (
        <Space size="small">
          {type === PaintType.Watercolor ? (
            <>
              Consistency:
              <span>
                <b>{paintFraction}</b> paint : <b>{fluidFraction}</b> water
              </span>
            </>
          ) : (
            <>
              Layer thikness:
              <span>
                {paintFraction}/{paintFraction + fluidFraction}
              </span>
            </>
          )}
          <Tooltip title={type ? CONSISTENCY_TOOLTIPS[type] : ''}>
            <QuestionCircleOutlined style={{color: colorTextTertiary, cursor: 'help'}} />
          </Tooltip>
        </Space>
      )}
      {showConsistency && backgroundRgb && (
        <Space size="small">
          <ColorSquare color={paintMixRgb} size="large" />
          over
          <ColorSquare color={backgroundRgb} size="large" />
          =
          <ColorSquare color={paintMixLayerRgb} size="large" />
        </Space>
      )}
    </Space>
  );
};
