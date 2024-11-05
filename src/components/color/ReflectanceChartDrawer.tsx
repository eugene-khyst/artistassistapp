/**
 * ArtistAssistApp
 * Copyright (C) 2023-2024  Eugene Khyst
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

import {Drawer, Typography} from 'antd';
import {useEffect} from 'react';

import {ColorMixtureDescription} from '~/src/components/color/ColorMixtureDescription';
import {useReflectanceChart} from '~/src/hooks';
import type {ColorMixture, ColorMixturePart} from '~/src/services/color';
import {COLOR_TYPES} from '~/src/services/color';

interface Props {
  colorMixture?: ColorMixture;
  open?: boolean;
  onClose?: () => void;
}

export const ReflectanceChartDrawer: React.FC<Props> = ({
  colorMixture,
  open = false,
  onClose,
}: Props) => {
  const {ref: canvasRef, reflectanceChartRef} = useReflectanceChart();

  useEffect(() => {
    const reflectanceChart = reflectanceChartRef.current;
    if (!reflectanceChart || !colorMixture) {
      return;
    }
    const {colorMixtureRgb, colorMixtureRho, parts} = colorMixture;
    reflectanceChart.removeAllSeries();
    parts.forEach(({color: {rho, rgb}}: ColorMixturePart) => {
      reflectanceChart.addReflectance(rho, rgb);
    });
    reflectanceChart.addReflectance(colorMixtureRho, colorMixtureRgb, 3);
  }, [reflectanceChartRef, colorMixture]);

  return (
    <Drawer
      title="Reflectance chart"
      placement="right"
      size="large"
      open={open}
      onClose={onClose}
      forceRender={true}
    >
      <canvas ref={canvasRef} width="688" height="388" style={{marginBottom: 16}} />
      {colorMixture && (
        <>
          <Typography.Title level={4}>{COLOR_TYPES.get(colorMixture.type)?.name}</Typography.Title>
          <ColorMixtureDescription colorMixture={colorMixture} showConsistency={false} />
        </>
      )}
    </Drawer>
  );
};
