/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {CheckboxOptionType, Input, Radio, RadioChangeEvent, Select, Space, Spin} from 'antd';
import {DefaultOptionType as SelectOptionType} from 'antd/es/select';
import {useEffect, useState} from 'react';
import {useZoomableImageCanvas} from '../hooks/';
import {GridCanvas, GridType} from '../services/canvas/image/grid-canvas';

const GRID_TYPE_OPTIONS: CheckboxOptionType[] = [
  {value: GridType.Rectangular, label: 'Rectangular'},
  {value: GridType.Diagonal, label: 'Diagonal'},
];

const GRID_SIZE_OPTIONS: SelectOptionType[] = [4, 6, 8].map((size: number) => ({
  value: size,
  label: size,
}));

const gridCanvasSupplier = (canvas: HTMLCanvasElement): GridCanvas => {
  return new GridCanvas(canvas);
};

type Props = {
  images: ImageBitmap[];
  isImagesLoading: boolean;
};

export const ImageGrid: React.FC<Props> = ({images, isImagesLoading}: Props) => {
  const {ref: canvasRef, zoomableImageCanvasRef: gridCanvasRef} =
    useZoomableImageCanvas<GridCanvas>(gridCanvasSupplier, images);

  const [gridType, setGridType] = useState<GridType>(GridType.Rectangular);
  const [gridRows, setGridRows] = useState<number>(4);
  const [gridCols, setGridCols] = useState<number>(4);

  useEffect(() => {
    const gridCanvas = gridCanvasRef.current;
    if (!gridCanvas) {
      return;
    }
    if (gridType === GridType.Rectangular) {
      gridCanvas.setGrid({type: gridType, rows: gridRows, cols: gridCols});
    } else if (gridType === GridType.Diagonal) {
      gridCanvas.setGrid({type: gridType});
    }
  }, [gridCanvasRef, gridType, gridRows, gridCols]);

  return (
    <Spin spinning={isImagesLoading} tip="Loading" size="large" delay={300}>
      <Space
        size="small"
        align="center"
        style={{width: '100%', justifyContent: 'center', marginBottom: 8}}
      >
        <Radio.Group
          options={GRID_TYPE_OPTIONS}
          value={gridType}
          onChange={(e: RadioChangeEvent) => setGridType(e.target.value)}
          optionType="button"
          buttonStyle="solid"
        />
        <Space.Compact>
          <Select
            value={gridRows}
            onChange={(value: number) => setGridRows(value)}
            options={GRID_SIZE_OPTIONS}
            disabled={gridType !== GridType.Rectangular}
          />
          <Input
            className="site-input-split"
            style={{
              width: 30,
              borderLeft: 0,
              borderRight: 0,
              pointerEvents: 'none',
            }}
            placeholder="×"
            disabled
          />
          <Select
            value={gridCols}
            onChange={(value: number) => setGridCols(value)}
            options={GRID_SIZE_OPTIONS}
            disabled={gridType !== GridType.Rectangular}
          />
        </Space.Compact>
      </Space>
      <div>
        <canvas ref={canvasRef} style={{width: '100%', height: `calc(100vh - 115px)`}} />
      </div>
    </Spin>
  );
};
