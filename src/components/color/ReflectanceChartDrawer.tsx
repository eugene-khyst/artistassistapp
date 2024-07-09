/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Drawer, Typography} from 'antd';
import {useEffect} from 'react';

import {ColorMixtureDescription} from '~/src/components/color/ColorMixtureDescription';
import {useReflectanceChart} from '~/src/hooks';
import type {ColorMixture, ColorMixturePart} from '~/src/services/color';
import {COLOR_TYPES} from '~/src/services/color';

type Props = {
  colorMixture?: ColorMixture;
  open?: boolean;
  onClose?: () => void;
};

export const ReflectanceChartDrawer: React.FC<Props> = ({
  colorMixture,
  open = false,
  onClose = () => {},
}: Props) => {
  const {ref: canvasRef, reflectanceChartRef} = useReflectanceChart();

  useEffect(() => {
    const reflectanceChart = reflectanceChartRef.current;
    if (!reflectanceChart || !colorMixture) {
      return;
    }
    const {colorMixtureRgb, colorMixtureRho, parts} = colorMixture;
    reflectanceChart.removeAllSeries();
    parts.forEach(({color: {rho, rgb}}: ColorMixturePart) =>
      reflectanceChart.addReflectance(rho, rgb)
    );
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
