/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Checkbox, Form, Select, Space, Spin} from 'antd';
import {CheckboxChangeEvent} from 'antd/es/checkbox';
import {DefaultOptionType as SelectOptionType} from 'antd/es/select';
import {useEffect, useState} from 'react';
import {useZoomableImageCanvas} from '../hooks/';
import {GridCanvas, GridType} from '../services/canvas/image/grid-canvas';

enum GridOption {
  Square = 1,
  Rectangular_3x3 = 2,
  Rectangular_4x4 = 3,
}

const GRID_OPTIONS: SelectOptionType[] = [
  {value: GridOption.Square, label: 'Square cells'},
  {value: GridOption.Rectangular_3x3, label: '3×3'},
  {value: GridOption.Rectangular_4x4, label: '4×4'},
];

const SQUARE_GRID_SIZE_OPTIONS: SelectOptionType[] = [4, 6, 8, 10, 12].map((size: number) => ({
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

  const [gridOption, setGridOption] = useState<GridOption>(GridOption.Square);
  const [squareGridSize, setSquareGridSize] = useState<number>(4);
  const [isDiagonals, setIsDiagonals] = useState<boolean>(false);

  useEffect(() => {
    const gridCanvas = gridCanvasRef.current;
    if (!gridCanvas) {
      return;
    }
    if (gridOption === GridOption.Square) {
      gridCanvas.setGrid({type: GridType.Square, size: [squareGridSize]});
    } else if (gridOption === GridOption.Rectangular_3x3) {
      gridCanvas.setGrid({type: GridType.Rectangular, size: [3, 3], diagonals: isDiagonals});
    } else if (gridOption === GridOption.Rectangular_4x4) {
      gridCanvas.setGrid({type: GridType.Rectangular, size: [4, 4], diagonals: isDiagonals});
    }
  }, [gridCanvasRef, gridOption, squareGridSize, isDiagonals]);

  return (
    <Spin spinning={isImagesLoading} tip="Loading" size="large" delay={300}>
      <Space align="baseline" style={{width: '100%', justifyContent: 'center', marginBottom: 8}}>
        <Form.Item label="Grid" style={{margin: 0}}>
          <Select
            value={gridOption}
            onChange={(value: number) => setGridOption(value)}
            options={GRID_OPTIONS}
            style={{width: 120}}
          />
        </Form.Item>
        {gridOption === GridOption.Square ? (
          <Form.Item
            label="Cells"
            tooltip="Number of cells on the smaller side (vertical or horizontal)"
            style={{margin: 0}}
          >
            <Select
              value={squareGridSize}
              onChange={(value: number) => setSquareGridSize(value)}
              options={SQUARE_GRID_SIZE_OPTIONS}
            />
          </Form.Item>
        ) : (
          <Form.Item label="Diagonals" tooltip="Show or hide diagonal lines" style={{margin: 0}}>
            <Checkbox
              checked={isDiagonals}
              onChange={(e: CheckboxChangeEvent) => {
                setIsDiagonals(e.target.checked);
              }}
            />
          </Form.Item>
        )}
      </Space>
      <div>
        <canvas ref={canvasRef} style={{width: '100%', height: `calc(100vh - 115px)`}} />
      </div>
    </Spin>
  );
};
