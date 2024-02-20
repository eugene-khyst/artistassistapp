/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {QuestionCircleOutlined} from '@ant-design/icons';
import {Space, Tooltip, Typography, theme} from 'antd';
import {ReactNode} from 'react';
import {PaintFraction, PaintMix} from '../../services/color';
import {ColorSquare} from './ColorSquare';
import {PaintConsistencyDescription} from './PaintConsistencyDescription';
import {PaintDescription} from './PaintDescription';

type Props = {
  paintMix: PaintMix;
  showPaints?: boolean;
  showConsistency?: boolean;
  extra?: ReactNode;
};

export const PaintMixDescription: React.FC<Props> = ({
  paintMix: {type: paintType, fractions, paintMixRgb, backgroundRgb, consistency, paintMixLayerRgb},
  showPaints = true,
  showConsistency = true,
  extra,
}: Props) => {
  const {
    token: {colorTextTertiary},
  } = theme.useToken();
  return (
    <Space direction="vertical" size="small">
      {showPaints && (
        <>
          <Space size="middle">
            {extra}
            {fractions.length > 1 && (
              <Space size="small" align="center">
                <Typography.Text>
                  Ratio: {fractions.map(({fraction}: PaintFraction) => fraction).join(' : ')}
                </Typography.Text>
                <Tooltip title="The proportions in which to mix the colors.">
                  <QuestionCircleOutlined style={{color: colorTextTertiary, cursor: 'help'}} />
                </Tooltip>
              </Space>
            )}
          </Space>
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
        </>
      )}
      {showConsistency && (
        <>
          <PaintConsistencyDescription paintType={paintType} consistency={consistency} />
          {backgroundRgb && (
            <Space size="small">
              <ColorSquare color={paintMixRgb} size="large" />
              over
              <ColorSquare color={backgroundRgb} size="large" />
              =
              <ColorSquare color={paintMixLayerRgb} size="large" />
            </Space>
          )}
        </>
      )}
    </Space>
  );
};
