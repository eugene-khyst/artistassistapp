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

import {LoadingOutlined} from '@ant-design/icons';
import type {CollapseProps} from 'antd';
import {Collapse, Spin, Typography} from 'antd';
import {useCallback, useEffect, useState} from 'react';

import type {ColorMixture, ColorType} from '~/src/services/color';
import {COLOR_TYPES} from '~/src/services/color';
import {useAppStore} from '~/src/stores/app-store';
import type {ArrayElement} from '~/src/utils';

import {ColorSwatchDrawer} from './color/ColorSwatchDrawer';
import {EmptyPalette} from './empty/EmptyPalette';
import {PaletteGrid} from './palette/PaletteGrid';

type ItemType = ArrayElement<CollapseProps['items']>;

export const Palette: React.FC = () => {
  const colorSet = useAppStore(state => state.colorSet);
  const paletteColorMixtures = useAppStore(state => state.paletteColorMixtures);
  const isInitialStateLoading = useAppStore(state => state.isInitialStateLoading);

  const [activePaletteKey, setActivePaletteKey] = useState<string | string[]>(
    [...COLOR_TYPES.keys()].map((colorType: ColorType) => colorType.toString())
  );

  const [colorSwatchColorMixtures, setColorSwatchColorMixtures] = useState<
    ColorMixture[] | undefined
  >();
  const [isOpenColorSwatch, setIsOpenColorSwatch] = useState<boolean>(false);

  const isLoading: boolean = isInitialStateLoading;

  useEffect(() => {
    if (colorSet) {
      setActivePaletteKey(colorSet.type.toString());
    }
  }, [colorSet]);

  const showColorSwatch = useCallback((colorMixtures: ColorMixture[]) => {
    setColorSwatchColorMixtures(colorMixtures);
    setIsOpenColorSwatch(true);
  }, []);

  const items: ItemType[] = [...COLOR_TYPES.entries()]
    .map(([colorType, {name}]): ItemType | undefined => {
      const colorMixturesByType: ColorMixture[] | undefined = paletteColorMixtures.filter(
        ({type}: ColorMixture) => type === colorType
      );
      if (!colorMixturesByType.length) {
        return;
      }
      return {
        key: colorType.toString(),
        label: <Typography.Text strong>{name} palette</Typography.Text>,
        children: (
          <PaletteGrid
            colorType={colorType}
            colorMixtures={colorMixturesByType}
            showColorSwatch={showColorSwatch}
          />
        ),
      };
    })
    .filter((item): item is ItemType => !!item);

  const handleActiveKeyChange = (keys: string | string[]) => {
    setActivePaletteKey(keys);
  };

  if (!paletteColorMixtures.length) {
    return <EmptyPalette />;
  }

  return (
    <>
      <Spin spinning={isLoading} tip="Loading" indicator={<LoadingOutlined spin />} size="large">
        <div style={{padding: '0 16px 16px'}}>
          <Collapse
            collapsible="icon"
            size="large"
            bordered={false}
            onChange={handleActiveKeyChange}
            items={items}
            activeKey={activePaletteKey}
          />
        </div>
      </Spin>
      <ColorSwatchDrawer
        colorMixtures={colorSwatchColorMixtures}
        open={isOpenColorSwatch}
        onClose={() => {
          setIsOpenColorSwatch(false);
        }}
      />
    </>
  );
};
