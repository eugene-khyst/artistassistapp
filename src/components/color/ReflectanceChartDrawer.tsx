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

import {useLingui} from '@lingui/react/macro';
import type {CheckboxOptionType, RadioChangeEvent} from 'antd';
import {Drawer, Form, Radio, Typography} from 'antd';
import {useEffect, useState} from 'react';

import {ColorMixtureDescription} from '~/src/components/color/ColorMixtureDescription';
import {COLOR_TYPE_LABELS} from '~/src/components/messages';
import {useReflectanceChart} from '~/src/hooks/useReflectanceChart';
import {Rgb} from '~/src/services/color/space/rgb';
import type {ColorMixture, ColorMixturePart} from '~/src/services/color/types';

enum ChartMode {
  Similarity = 1,
  Mixture = 2,
}

interface Props {
  targetColor?: string;
  colorMixture?: ColorMixture;
  open?: boolean;
  onClose?: () => void;
}

export const ReflectanceChartDrawer: React.FC<Props> = ({
  targetColor,
  colorMixture,
  open = false,
  onClose,
}: Props) => {
  const {t} = useLingui();

  const {ref: canvasRef, reflectanceChart} = useReflectanceChart();

  const [chartMode, setChartMode] = useState<ChartMode>(
    targetColor ? ChartMode.Similarity : ChartMode.Mixture
  );

  useEffect(() => {
    if (!reflectanceChart) {
      return;
    }
    reflectanceChart.removeAllSeries();
    if (colorMixture) {
      const {layerRgb, layerRho, parts, white} = colorMixture;
      reflectanceChart.addReflectance(layerRho, layerRgb, 3);
      if (chartMode === ChartMode.Mixture) {
        parts.forEach(({color: {rho, rgb}}: ColorMixturePart) => {
          reflectanceChart.addReflectance(rho, rgb);
        });
        if (white) {
          reflectanceChart.addReflectance(white.rho, white.rgb);
        }
      }
    }
    if (targetColor && chartMode === ChartMode.Similarity) {
      const rgb = Rgb.fromHex(targetColor);
      reflectanceChart.addReflectance(rgb.toReflectance().toArray(), rgb.toTuple());
    }
  }, [reflectanceChart, targetColor, colorMixture, chartMode]);

  const handleChartModeChange = (e: RadioChangeEvent) => {
    setChartMode(e.target.value as number);
  };

  const chartOptions: CheckboxOptionType<number>[] = [
    {value: ChartMode.Similarity, label: t`Similarity`},
    {value: ChartMode.Mixture, label: t`Mixture`},
  ];

  return (
    <Drawer
      title={t`Spectral reflectance curve`}
      placement="right"
      size="large"
      open={open}
      onClose={onClose}
    >
      <canvas ref={canvasRef} width="688" height="388" style={{marginBottom: 16}} />
      {targetColor && (
        <Form.Item
          label={t`Mode`}
          tooltip={t`Similarity mode compares the target and suggested colors. In Mixture mode, the parts of the color that make up the mixture are displayed.`}
          style={{marginBottom: 0}}
        >
          <Radio.Group
            options={chartOptions}
            value={chartMode}
            onChange={handleChartModeChange}
            optionType="button"
            buttonStyle="solid"
          />
        </Form.Item>
      )}
      {colorMixture && (
        <>
          <Typography.Title level={4}>{t(COLOR_TYPE_LABELS[colorMixture.type])}</Typography.Title>
          <ColorMixtureDescription colorMixture={colorMixture} />
        </>
      )}
    </Drawer>
  );
};
