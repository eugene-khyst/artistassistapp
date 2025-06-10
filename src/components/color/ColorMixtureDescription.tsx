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

import {Trans} from '@lingui/react/macro';
import {Space, Typography} from 'antd';

import type {ColorMixture, ColorMixturePart} from '~/src/services/color/types';
import {formatFraction, formatRatio} from '~/src/utils/format';
import {toRatio} from '~/src/utils/fraction';

import {ColorDescription} from './ColorDescription';
import {ColorSquare} from './ColorSquare';
import {ConsistencyDescription} from './ConsistencyDescription';

interface Props {
  colorMixture: ColorMixture;
  showColors?: boolean;
  showConsistency?: boolean;
  showTooltips?: boolean;
}

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
  const partsRatioText: string = parts.map(({part}: ColorMixturePart) => part).join(':');
  const whiteRatioText: string = formatRatio(whiteFraction, true);
  return (
    <Space direction="vertical">
      {showColors && (
        <>
          {parts.length > 1 && (
            <Typography.Text>
              <Trans>
                Mix colors in a <Typography.Text strong>{partsRatioText} ratio</Typography.Text>
              </Trans>
            </Typography.Text>
          )}
          <Space>
            {parts.length > 1 ? (
              <>
                <Space direction="vertical">
                  {parts.map(({color, part}: ColorMixturePart, i: number) => {
                    return <ColorDescription colorType={type} key={i} color={color} text={part} />;
                  })}
                </Space>
                <Typography.Text>=</Typography.Text>
                <ColorSquare color={colorMixtureRgb} size="large" />
              </>
            ) : (
              <ColorDescription colorType={type} color={parts[0]!.color} />
            )}
          </Space>
        </>
      )}
      {white && (
        <>
          <Typography.Text>
            <Trans>
              Add white in a <Typography.Text strong>{whiteRatioText} ratio</Typography.Text>
            </Trans>
          </Typography.Text>
          <Space>
            <Space direction="vertical">
              <Space>
                <ColorSquare color={colorMixtureRgb} text={colorMixturePart} size="large" />
                <Typography.Text>
                  <Trans>Color mixture</Trans>
                </Typography.Text>
              </Space>
              <ColorDescription colorType={type} color={white} text={whitePart} />
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
            <Space>
              <ColorSquare color={tintRgb} text={formatFraction(consistency)} size="large" />
              <Typography.Text>
                <Trans>over</Trans>
              </Typography.Text>
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
