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

import {MinusOutlined, PlusOutlined} from '@ant-design/icons';
import {
  type ColorId,
  type ColorMixture,
  type ColorSet,
  filterColors,
  type Fraction,
  isFullStrength,
  isMixable,
  isTransparentLayeringSupported,
  makeColorMixtures,
  MIXABLE_COLOR_TYPES,
  RATIOS_2,
  rgbToHex,
} from '@eugene-khyst/artistassistapp-color-mixer';
import {Trans} from '@lingui/react/macro';
import {Button, Flex, Form, Space, Typography} from 'antd';
import {clsx} from 'clsx';
import {Fragment, useMemo, useRef, useState} from 'react';

import {ColorSquare} from '@/components/color/ColorSquare';
import {ColorCascader} from '@/components/color-set/ColorCascader';
import {EmptyColorSet} from '@/components/empty/EmptyColorSet';
import {columnCountStyle} from '@/components/utils';
import {useColorSetReset} from '@/hooks/useColorSetReset';
import {useAppStore} from '@/stores/app-store';
import {formatFraction} from '@/utils/format';

import styles from './TwoColorGradient.module.css';

interface ColorPair {
  id: number;
  color1?: ColorId;
  color2?: ColorId;
}

const RATIOS = [[1, 0], ...[...RATIOS_2].reverse(), [0, 1]] as const;
const THICKNESSES = [
  [1, 2],
  [1, 4],
] as const satisfies readonly Fraction[];

const INITIAL_PAIRS: ColorPair[] = [{id: 0}];

function ColorPairGradient({
  colorSet,
  color1,
  color2,
  className,
}: Readonly<{colorSet: ColorSet; color1?: ColorId; color2?: ColorId; className?: string}>) {
  const colorMixtures = useMemo<ColorMixture[][] | undefined>(() => {
    if (!color1 || !color2) {
      return;
    }
    const colors = filterColors(colorSet.colors, [color1, color2]);
    if (colors.length !== 2) {
      return;
    }
    return makeColorMixtures({
      type: colorSet.type,
      colors,
      ratios: RATIOS,
      consistencies: THICKNESSES,
    });
  }, [colorSet, color1, color2]);

  if (!colorMixtures) {
    return null;
  }

  return (
    <div className={clsx(styles['scroll'], className)}>
      <div className={`u-color-grid ${styles['gradient']}`} style={columnCountStyle(RATIOS.length)}>
        <div />
        {RATIOS.map(ratio => {
          const ratioStr = ratio.join(':');
          return (
            <Typography.Text key={ratioStr} strong>
              {ratioStr}
            </Typography.Text>
          );
        })}
        {colorMixtures[0]!.map(({consistency}, row) => {
          const consistencyStr = isFullStrength({consistency}) ? '1' : formatFraction(consistency);
          return (
            <Fragment key={consistencyStr}>
              <Typography.Text strong className={styles['rowLabel']}>
                {consistencyStr}
              </Typography.Text>
              {colorMixtures.map(mixtures => {
                const {layerRgb, key} = mixtures[row]!;
                return <ColorSquare key={key} hex={rgbToHex(...layerRgb)} size="large" />;
              })}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

export function TwoColorGradient() {
  const colorSet = useAppStore(state => state.colorSet);

  const [colorPairs, setColorPairs] = useState<ColorPair[]>(INITIAL_PAIRS);
  const nextPairIdRef = useRef(1);

  const selectedColorIds = useMemo(
    () =>
      colorPairs.map(({color1, color2}: ColorPair) =>
        [color1, color2].filter((id): id is ColorId => !!id)
      ),
    [colorPairs]
  );

  useColorSetReset(selectedColorIds.flat(), () => {
    setColorPairs(INITIAL_PAIRS);
  });

  const setPairColor = (id: number, key: 'color1' | 'color2', color: ColorId) => {
    setColorPairs(prev => prev.map(pair => (pair.id === id ? {...pair, [key]: color} : pair)));
  };

  if (!colorSet || !isMixable(colorSet.type)) {
    return <EmptyColorSet supportedColorTypes={MIXABLE_COLOR_TYPES} />;
  }

  return (
    <Flex vertical gap="small" className="u-tab-content">
      <Typography.Text strong>
        <Trans>Select color pairs to chart every mixing ratio and consistency</Trans>
      </Typography.Text>

      {colorPairs.map(({id, color1, color2}: ColorPair, index: number) => (
        <Fragment key={id}>
          <Form.Item className="u-mb-0">
            <Flex gap="small" align="center" wrap>
              <ColorCascader
                value={color1}
                onChange={(color: ColorId) => {
                  setPairColor(id, 'color1', color);
                }}
                disabledColorIds={selectedColorIds[index]}
                placeholder={<Trans>Select the first color</Trans>}
                className="u-w-fit u-max-w-100"
              />
              <ColorCascader
                value={color2}
                onChange={(color: ColorId) => {
                  setPairColor(id, 'color2', color);
                }}
                disabledColorIds={selectedColorIds[index]}
                placeholder={<Trans>Select the second color</Trans>}
                className="u-w-fit u-max-w-100"
              />
              {colorPairs.length > 1 && (
                <Button
                  shape="circle"
                  icon={<MinusOutlined />}
                  onClick={() => {
                    setColorPairs(prev => prev.filter(pair => pair.id !== id));
                  }}
                />
              )}
            </Flex>
          </Form.Item>

          <ColorPairGradient
            colorSet={colorSet}
            color1={color1}
            color2={color2}
            className={index < colorPairs.length - 1 ? 'u-mb-xs' : undefined}
          />
        </Fragment>
      ))}

      {colorPairs.some(({color1, color2}: ColorPair) => color1 && color2) && (
        <Typography.Text type="secondary">
          {isTransparentLayeringSupported(colorSet.type) ? (
            <Trans>Each column is a mixing ratio, each row a consistency</Trans>
          ) : (
            <Trans>Each column is a mixing ratio</Trans>
          )}
        </Typography.Text>
      )}

      <Space>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setColorPairs(prev => [...prev, {id: nextPairIdRef.current++}]);
          }}
        >
          <Trans>Add color pair</Trans>
        </Button>
      </Space>
    </Flex>
  );
}
