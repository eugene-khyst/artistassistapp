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

import {DownloadOutlined, LoadingOutlined, MoreOutlined, PrinterOutlined} from '@ant-design/icons';
import type {MenuProps} from 'antd';
import {Button, Checkbox, Dropdown, Form, Grid, Select, Space, Spin} from 'antd';
import type {CheckboxChangeEvent} from 'antd/es/checkbox';
import type {DefaultOptionType as SelectOptionType} from 'antd/es/select';
import {useCallback, useEffect, useState} from 'react';

import {useZoomableImageCanvas} from '~/src/hooks';
import {GridCanvas, GridType} from '~/src/services/canvas/image/grid-canvas';
import {printImages} from '~/src/services/print';
import {useAppStore} from '~/src/stores/app-store';

import {EmptyImage} from './empty/EmptyImage';

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

const DEFAULT_SQUARE_GRID_SIZE = 4;

const gridCanvasSupplier = (canvas: HTMLCanvasElement): GridCanvas => {
  return new GridCanvas(canvas);
};

export const ImageGrid: React.FC = () => {
  const originalImage = useAppStore(state => state.originalImage);
  const isOriginalImageLoading = useAppStore(state => state.isOriginalImageLoading);

  const screens = Grid.useBreakpoint();

  const [gridOption, setGridOption] = useState<GridOption>(GridOption.Square);
  const [squareGridSize, setSquareGridSize] = useState<number>(DEFAULT_SQUARE_GRID_SIZE);
  const [isDiagonals, setIsDiagonals] = useState<boolean>(false);

  const {ref: canvasRef, zoomableImageCanvas: gridCanvas} = useZoomableImageCanvas<GridCanvas>(
    gridCanvasSupplier,
    originalImage
  );

  useEffect(() => {
    if (!gridCanvas) {
      return;
    }
    if (gridOption === GridOption.Square) {
      gridCanvas.setGrid({type: GridType.Square, size: [squareGridSize]});
    } else if (gridOption === GridOption.Rectangular_3x3) {
      gridCanvas.setGrid({type: GridType.Rectangular, size: [3, 3], diagonals: isDiagonals});
    } else {
      gridCanvas.setGrid({type: GridType.Rectangular, size: [4, 4], diagonals: isDiagonals});
    }
  }, [gridCanvas, gridOption, squareGridSize, isDiagonals]);

  const blobSupplier = useCallback(
    async (): Promise<Blob | undefined> => gridCanvas?.convertToBlob(),
    [gridCanvas]
  );

  const handlePrintClick = () => {
    void printImages(blobSupplier);
  };

  const handleSaveClick = () => {
    void gridCanvas?.saveAsImage('ArtistAssistApp-Grid');
  };

  const items: MenuProps['items'] = [
    {
      key: '1',
      label: 'Print',
      icon: <PrinterOutlined />,
      onClick: handlePrintClick,
    },
    {
      key: '2',
      label: 'Save',
      icon: <DownloadOutlined />,
      onClick: handleSaveClick,
    },
  ];

  if (!originalImage) {
    return <EmptyImage feature="draw a grid over a reference photo" />;
  }

  return (
    <Spin
      spinning={isOriginalImageLoading}
      tip="Loading"
      indicator={<LoadingOutlined spin />}
      size="large"
    >
      <Space align="start" style={{width: '100%', justifyContent: 'center', marginBottom: 8}}>
        <Form.Item label="Grid" style={{margin: 0}}>
          <Select
            value={gridOption}
            onChange={(value: number) => {
              setGridOption(value);
            }}
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
              onChange={(value: number) => {
                setSquareGridSize(value);
              }}
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
        {screens.sm ? (
          <>
            <Button icon={<PrinterOutlined />} onClick={handlePrintClick}>
              Print
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleSaveClick}>
              Save
            </Button>
          </>
        ) : (
          <Dropdown menu={{items}}>
            <Button icon={<MoreOutlined />} />
          </Dropdown>
        )}
      </Space>
      <div>
        <canvas ref={canvasRef} style={{width: '100%', height: `calc(100vh - 115px)`}} />
      </div>
    </Spin>
  );
};
