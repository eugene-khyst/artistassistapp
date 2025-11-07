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
import {Checkbox, Form, Select, Space} from 'antd';
import type {CheckboxChangeEvent} from 'antd/es/checkbox';
import type {DefaultOptionType as SelectOptionType} from 'antd/es/select';
import type {SpaceProps} from 'antd/lib';
import {useContext, useEffect, useState} from 'react';

import {DEFAULT_GRID_SETTINGS, setGrid} from '~/src/components/grid/grid';
import {TabContext} from '~/src/contexts/TabContext';
import {type GridCanvas} from '~/src/services/canvas/image/grid-canvas';
import type {AppSettings, GridSettings} from '~/src/services/settings/types';
import {GridMode} from '~/src/services/settings/types';
import {useAppStore} from '~/src/stores/app-store';
import type {TabKey} from '~/src/tabs';

const SQUARE_GRID_SIZE_OPTIONS: SelectOptionType[] = [4, 6, 8, 10, 12].map((size: number) => ({
  value: size,
  label: size,
}));

type Props = {
  gridCanvas?: GridCanvas;
  disableable?: boolean;
  defaultGridSettings?: Partial<GridSettings>;
} & Pick<SpaceProps, 'direction' | 'size' | 'style'>;

export const GridControls: React.FC<Props> = ({
  gridCanvas,
  disableable = false,
  defaultGridSettings,
  ...props
}: Props) => {
  const appSettings = useAppStore(state => state.appSettings);
  const saveAppSettings = useAppStore(state => state.saveAppSettings);

  const {t} = useLingui();

  const tab: TabKey = useContext(TabContext);

  const {
    enabled: defaultEnabled,
    mode: defaultMode,
    size: defaultSize,
    diagonals: defaultDiagonals,
  } = {
    ...DEFAULT_GRID_SETTINGS,
    ...(defaultGridSettings ?? {}),
  };

  const [gridEnabled, setGridEnabled] = useState<boolean>(!disableable || defaultEnabled);
  const [gridMode, setGridMode] = useState<GridMode>(defaultMode);
  const [gridSize, setGridSize] = useState<number>(defaultSize);
  const [gridDiagonals, setGridDiagonals] = useState<boolean>(defaultDiagonals);

  useEffect(() => {
    const {enabled, mode, size, diagonals} = appSettings.grids?.[tab] ?? {};
    if (enabled) {
      setGridEnabled(enabled);
    }
    if (mode) {
      setGridMode(mode);
    }
    if (size) {
      setGridSize(size);
    }
    if (diagonals) {
      setGridDiagonals(diagonals);
    }
  }, [appSettings, tab]);

  useEffect(() => {
    if (!gridCanvas) {
      return;
    }
    setGrid(gridCanvas, {
      enabled: !disableable || gridEnabled,
      mode: gridMode,
      size: gridSize,
      diagonals: gridDiagonals,
    });
  }, [gridCanvas, disableable, gridEnabled, gridMode, gridSize, gridDiagonals]);

  const handleEnabledChange = (e: CheckboxChangeEvent) => {
    const value = e.target.checked;
    setGridEnabled(value);
    void saveAppSettings((prev?: AppSettings): Partial<AppSettings> => {
      return {
        grids: {
          ...(prev?.grids ?? {}),
          [tab]: {
            ...(prev?.grids?.[tab] ?? {}),
            enabled: value,
          },
        },
      };
    });
  };

  const handleModeChange = (value: number) => {
    setGridMode(value);
    void saveAppSettings((prev?: AppSettings): Partial<AppSettings> => {
      return {
        grids: {
          ...(prev?.grids ?? {}),
          [tab]: {
            ...(prev?.grids?.[tab] ?? {}),
            mode: value,
          },
        },
      };
    });
  };

  const handleSizeChange = (value: number) => {
    setGridSize(value);
    void saveAppSettings((prev?: AppSettings): Partial<AppSettings> => {
      return {
        grids: {
          ...(prev?.grids ?? {}),
          [tab]: {
            ...(prev?.grids?.[tab] ?? {}),
            size: value,
          },
        },
      };
    });
  };

  const handleDiagonalsChange = (e: CheckboxChangeEvent) => {
    const value = e.target.checked;
    setGridDiagonals(value);
    void saveAppSettings((prev?: AppSettings): Partial<AppSettings> => {
      return {
        grids: {
          ...(prev?.grids ?? {}),
          [tab]: {
            ...(prev?.grids?.[tab] ?? {}),
            diagonals: value,
          },
        },
      };
    });
  };

  const gridOptions: SelectOptionType[] = [
    {value: GridMode.Square, label: t`Square cells`},
    {value: GridMode.Rectangular_4x4, label: '4×4'},
    {value: GridMode.Rectangular_3x3, label: '3×3'},
    {value: GridMode.Rectangular_2x2, label: '2×2'},
  ];

  return (
    <Space {...props}>
      {disableable && (
        <Form.Item label={t`Show grid`} tooltip={t`Show or hide grid`} style={{margin: 0}}>
          <Checkbox checked={gridEnabled} onChange={handleEnabledChange} />
        </Form.Item>
      )}
      <Form.Item label={t`Grid`} style={{margin: 0}}>
        <Select
          value={gridMode}
          onChange={handleModeChange}
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
          <Select value={gridSize} onChange={handleSizeChange} options={SQUARE_GRID_SIZE_OPTIONS} />
        </Form.Item>
      ) : (
        <Form.Item
          label={t`Diagonals`}
          tooltip={t`Show or hide diagonal lines`}
          style={{margin: 0}}
        >
          <Checkbox checked={gridDiagonals} onChange={handleDiagonalsChange} />
        </Form.Item>
      )}
    </Space>
  );
};
