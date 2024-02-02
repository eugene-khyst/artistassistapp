/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {CheckboxOptionType, Radio, RadioChangeEvent, Select, Space, Spin} from 'antd';
import {DefaultOptionType as SelectOptionType} from 'antd/es/select';
import {useEffect, useState} from 'react';
import {useZoomableImageCanvas} from '../hooks/';
import {GridCanvas, GridType} from '../services/canvas/image/grid-canvas';

const GRID_TYPE_OPTIONS: CheckboxOptionType[] = [
  {value: GridType.Square, label: 'Square'},
  {value: GridType.Diagonal, label: 'Diagonal'},
];

const SQUARE_GRID_SIZE_OPTIONS: SelectOptionType[] = [4, 6, 8, 10].map((size: number) => ({
  value: size,
  label: size,
}));

const DIAGONAL_GRID_SIZE_OPTIONS: SelectOptionType[] = [1, 2, 3].map((size: number) => ({
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

  const [gridType, setGridType] = useState<GridType>(GridType.Square);
  const [squareGridSize, setSquareGridSize] = useState<number>(4);
  const [diagonalGridSize, setDiagonalGridSize] = useState<number>(2);

  useEffect(() => {
    const gridCanvas = gridCanvasRef.current;
    if (!gridCanvas) {
      return;
    }
    if (gridType === GridType.Square) {
      gridCanvas.setGrid({type: gridType, size: squareGridSize});
    } else if (gridType === GridType.Diagonal) {
      gridCanvas.setGrid({type: gridType, size: diagonalGridSize});
    }
  }, [gridCanvasRef, gridType, squareGridSize, diagonalGridSize]);

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
          {gridType === GridType.Square && (
            <Select
              value={squareGridSize}
              onChange={(value: number) => setSquareGridSize(value)}
              options={SQUARE_GRID_SIZE_OPTIONS}
            />
          )}
          {gridType === GridType.Diagonal && (
            <Select
              value={diagonalGridSize}
              onChange={(value: number) => setDiagonalGridSize(value)}
              options={DIAGONAL_GRID_SIZE_OPTIONS}
            />
          )}
        </Space.Compact>
      </Space>
      <div>
        <canvas ref={canvasRef} style={{width: '100%', height: `calc(100vh - 115px)`}} />
      </div>
    </Spin>
  );
};
