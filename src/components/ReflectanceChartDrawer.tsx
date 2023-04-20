/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Drawer, Typography} from 'antd';
import {useEffect} from 'react';
import {useReflectanceChart} from '../hooks';
import {PAINT_TYPE_LABELS, PaintFraction, PaintMix} from '../services/color';
import {PaintMixDescription} from './color/PaintMixDescription';

type Props = {
  paintMix?: PaintMix;
  open?: boolean;
  onClose?: () => void;
};

export const ReflectanceChartDrawer: React.FC<Props> = ({
  paintMix,
  open = false,
  onClose = () => {},
}: Props) => {
  const {ref: canvasRef, reflectanceChartRef} = useReflectanceChart();

  useEffect(() => {
    const reflectanceChart = reflectanceChartRef.current;
    if (!reflectanceChart || !paintMix) {
      return;
    }
    const {paintMixRgb, paintMixRho, fractions} = paintMix;
    reflectanceChart.removeAllSeries();
    fractions.forEach(({paint}: PaintFraction) =>
      reflectanceChart.addReflectance(paint.rho, paint.rgb)
    );
    reflectanceChart.addReflectance(paintMixRho, paintMixRgb);
  }, [reflectanceChartRef, paintMix]);

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
      {paintMix && (
        <>
          <Typography.Title level={4}>{PAINT_TYPE_LABELS[paintMix.type]}</Typography.Title>
          <PaintMixDescription paintMix={paintMix} showConsistency={false} />
        </>
      )}
    </Drawer>
  );
};
