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

import {DownloadOutlined, LoadingOutlined, MoreOutlined, PrinterOutlined} from '@ant-design/icons';
import {Trans, useLingui} from '@lingui/react/macro';
import type {MenuProps} from 'antd';
import {Button, Checkbox, Dropdown, Form, Grid, Select, Space, Spin} from 'antd';
import type {CheckboxChangeEvent} from 'antd/es/checkbox';
import type {DefaultOptionType as SelectOptionType} from 'antd/es/select';
import {useCallback, useEffect, useState} from 'react';

import {useZoomableImageCanvas} from '~/src/hooks/useZoomableImageCanvas';
import {GridCanvas, GridType} from '~/src/services/canvas/image/grid-canvas';
import {saveAppSettings} from '~/src/services/db/app-settings-db';
import {printImages} from '~/src/services/print/print';
import {GridMode} from '~/src/services/settings/types';
import {useAppStore} from '~/src/stores/app-store';
import {getFilename} from '~/src/utils/filename';

import {EmptyImage} from './empty/EmptyImage';

const SQUARE_GRID_SIZE_OPTIONS: SelectOptionType[] = [4, 6, 8, 10, 12].map((size: number) => ({
  value: size,
  label: size,
}));

const DEFAULT_SQUARE_GRID_SIZE = 4;

const gridCanvasSupplier = (canvas: HTMLCanvasElement): GridCanvas => {
  return new GridCanvas(canvas, {lineWidth: 1.5});
};

export const ImageGrid: React.FC = () => {
  const appSettings = useAppStore(state => state.appSettings);
  const originalImageFile = useAppStore(state => state.originalImageFile);
  const originalImage = useAppStore(state => state.originalImage);

  const isOriginalImageLoading = useAppStore(state => state.isOriginalImageLoading);

  const screens = Grid.useBreakpoint();

  const {t} = useLingui();

  const [gridMode, setGridMode] = useState<GridMode>(GridMode.Square);
  const [gridSize, setGridSize] = useState<number>(DEFAULT_SQUARE_GRID_SIZE);
  const [gridDiagonals, setGridDiagonals] = useState<boolean>(false);

  const {ref: canvasRef, zoomableImageCanvas: gridCanvas} = useZoomableImageCanvas<GridCanvas>(
    gridCanvasSupplier,
    originalImage
  );

  useEffect(() => {
    const {gridMode, gridSize, gridDiagonals} = appSettings;
    if (gridMode) {
      setGridMode(gridMode);
    }
    if (gridSize) {
      setGridSize(gridSize);
    }
    if (gridDiagonals) {
      setGridDiagonals(gridDiagonals);
    }
  }, [appSettings]);

  useEffect(() => {
    if (!gridCanvas) {
      return;
    }
    if (gridMode === GridMode.Square) {
      gridCanvas.setGrid({type: GridType.Square, size: [gridSize]});
    } else if (gridMode === GridMode.Rectangular_3x3) {
      gridCanvas.setGrid({type: GridType.Rectangular, size: [3, 3], diagonals: gridDiagonals});
    } else {
      gridCanvas.setGrid({type: GridType.Rectangular, size: [4, 4], diagonals: gridDiagonals});
    }
  }, [gridCanvas, gridMode, gridSize, gridDiagonals]);

  const blobSupplier = useCallback(
    async (): Promise<Blob | undefined> => gridCanvas?.convertToBlob(),
    [gridCanvas]
  );

  const handleGridModeChange = (value: number) => {
    setGridMode(value);
    void saveAppSettings({gridMode: value});
  };

  const handleGridSizeChange = (value: number) => {
    setGridSize(value);
    void saveAppSettings({gridSize: value});
  };

  const handleGridDiagonalsChange = (e: CheckboxChangeEvent) => {
    const value = e.target.checked;
    setGridDiagonals(value);
    void saveAppSettings({gridDiagonals: value});
  };

  const handlePrintClick = () => {
    void printImages(blobSupplier);
  };

  const handleSaveClick = () => {
    void gridCanvas?.saveAsImage(getFilename(originalImageFile, 'grid'));
  };

  const items: MenuProps['items'] = [
    {
      key: '1',
      label: t`Print`,
      icon: <PrinterOutlined />,
      onClick: handlePrintClick,
    },
    {
      key: '2',
      label: t`Save`,
      icon: <DownloadOutlined />,
      onClick: handleSaveClick,
    },
  ];

  if (!originalImage) {
    return <EmptyImage />;
  }

  const gridOptions: SelectOptionType[] = [
    {value: GridMode.Square, label: t`Square cells`},
    {value: GridMode.Rectangular_3x3, label: '3×3'},
    {value: GridMode.Rectangular_4x4, label: '4×4'},
  ];

  return (
    <Spin spinning={isOriginalImageLoading} indicator={<LoadingOutlined spin />} size="large">
      <Space align="start" style={{width: '100%', justifyContent: 'center', marginBottom: 8}}>
        <Form.Item label={t`Grid`} style={{margin: 0}}>
          <Select
            value={gridMode}
            onChange={handleGridModeChange}
            options={gridOptions}
            style={{width: 125}}
          />
        </Form.Item>
        {gridMode === GridMode.Square ? (
          <Form.Item
            label={t`Cells`}
            tooltip={t`Number of cells on the smaller side (vertical or horizontal)`}
            style={{margin: 0}}
          >
            <Select
              value={gridSize}
              onChange={handleGridSizeChange}
              options={SQUARE_GRID_SIZE_OPTIONS}
            />
          </Form.Item>
        ) : (
          <Form.Item
            label={t`Diagonals`}
            tooltip={t`Show or hide diagonal lines`}
            style={{margin: 0}}
          >
            <Checkbox checked={gridDiagonals} onChange={handleGridDiagonalsChange} />
          </Form.Item>
        )}
        {screens.sm ? (
          <>
            <Button icon={<PrinterOutlined />} onClick={handlePrintClick}>
              <Trans>Print</Trans>
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleSaveClick}>
              <Trans>Save</Trans>
            </Button>
          </>
        ) : (
          <Dropdown menu={{items}}>
            <Button icon={<MoreOutlined />} />
          </Dropdown>
        )}
      </Space>
      <div>
        <canvas ref={canvasRef} style={{width: '100%', height: `calc(100dvh - 115px)`}} />
      </div>
    </Spin>
  );
};
