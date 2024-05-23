/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Space, Typography} from 'antd';

import type {ColorMixture, ColorMixturePart} from '~/src/services/color';
import {formatFraction, formatRatio, toRatio} from '~/src/utils';

import {ColorDescription} from './ColorDescription';
import {ColorSquare} from './ColorSquare';
import {ConsistencyDescription} from './ConsistencyDescription';

type Props = {
  colorMixture: ColorMixture;
  showColors?: boolean;
  showConsistency?: boolean;
  showTooltips?: boolean;
};

export const ColorMixtureDescription: React.FC<Props> = ({
  colorMixture: {
    type,
    parts,
    colorMixtureRgb,
    whiteFraction,
    white,
    tintRgb,
    consistency,
    backgroundRgb,
    layerRgb,
  },
  showColors = true,
  showConsistency = true,
  showTooltips = true,
}: Props) => {
  const [whitePart, colorMixturePart] = toRatio(whiteFraction);
  return (
    <Space direction="vertical" size="small">
      {showColors && (
        <>
          {parts.length > 1 && (
            <Typography.Text>
              Mix colors in a {parts.map(({part}: ColorMixturePart) => part).join(':')} ratio
            </Typography.Text>
          )}
          <Space size="small">
            {parts.length > 1 ? (
              <>
                <Space direction="vertical" size="small">
                  {parts.map(({color, part}: ColorMixturePart, i: number) => {
                    return <ColorDescription key={i} color={color} text={part} />;
                  })}
                </Space>
                <Typography.Text>=</Typography.Text>
                <ColorSquare color={colorMixtureRgb} size="large" />
              </>
            ) : (
              <ColorDescription color={parts[0].color} />
            )}
          </Space>
        </>
      )}
      {white && (
        <>
          <Typography.Text>Add white in a {formatRatio(whiteFraction, true)} ratio</Typography.Text>
          <Space size="small">
            <Space direction="vertical" size="small">
              <Space size="small">
                <ColorSquare color={colorMixtureRgb} text={colorMixturePart} size="large" />
                <Typography.Text>Color mixture</Typography.Text>
              </Space>
              <ColorDescription color={white} text={whitePart} />
            </Space>
            <Typography.Text>=</Typography.Text>
            <ColorSquare color={tintRgb} size="large" />
          </Space>
        </>
      )}
      {showConsistency && (
        <>
          <ConsistencyDescription
            colorType={type}
            consistency={consistency}
            showTooltip={showTooltips}
          />
          {backgroundRgb && (
            <Space size="small">
              <ColorSquare color={tintRgb} text={formatFraction(consistency)} size="large" />
              <Typography.Text>over</Typography.Text>
              <ColorSquare color={backgroundRgb} size="large" />
              <Typography.Text>=</Typography.Text>
              <ColorSquare color={layerRgb} size="large" />
            </Space>
          )}
        </>
      )}
    </Space>
  );
};
