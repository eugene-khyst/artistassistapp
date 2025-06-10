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
import type {CollapseProps} from 'antd';
import {Collapse, Typography} from 'antd';
import {useCallback, useEffect, useState} from 'react';

import {COLOR_TYPE_LABELS} from '~/src/components/messages';
import {COLOR_TYPES} from '~/src/services/color/colors';
import type {ColorMixture, ColorType} from '~/src/services/color/types';
import {useAppStore} from '~/src/stores/app-store';
import type {ArrayElement} from '~/src/utils/array';

import {ColorSwatchDrawer} from './color/ColorSwatchDrawer';
import {EmptyPalette} from './empty/EmptyPalette';
import {PaletteGrid} from './palette/PaletteGrid';

type ItemType = ArrayElement<CollapseProps['items']>;

export const Palette: React.FC = () => {
  const colorSet = useAppStore(state => state.colorSet);
  const paletteColorMixtures = useAppStore(state => state.paletteColorMixtures);

  const {t} = useLingui();

  const [activePaletteKey, setActivePaletteKey] = useState<string | string[]>(
    COLOR_TYPES.map((colorType: ColorType) => colorType.toString())
  );

  const [colorSwatchColorMixtures, setColorSwatchColorMixtures] = useState<
    ColorMixture[] | undefined
  >();
  const [isOpenColorSwatch, setIsOpenColorSwatch] = useState<boolean>(false);

  useEffect(() => {
    if (colorSet) {
      setActivePaletteKey(colorSet.type.toString());
    }
  }, [colorSet]);

  const showColorSwatch = useCallback((colorMixtures: ColorMixture[]) => {
    setColorSwatchColorMixtures(colorMixtures);
    setIsOpenColorSwatch(true);
  }, []);

  const items: ItemType[] = COLOR_TYPES.map((colorType: ColorType): ItemType | undefined => {
    const colorMixturesByType: ColorMixture[] | undefined = [
      ...paletteColorMixtures.values(),
    ].filter(({type}: ColorMixture) => type === colorType);
    if (!colorMixturesByType.length) {
      return;
    }
    return {
      key: colorType.toString(),
      label: <Typography.Text strong>{t(COLOR_TYPE_LABELS[colorType])}</Typography.Text>,
      children: (
        <PaletteGrid
          colorType={colorType}
          colorMixtures={colorMixturesByType}
          showColorSwatch={showColorSwatch}
        />
      ),
    };
  }).filter((item): item is ItemType => !!item);

  const handleActiveKeyChange = (keys: string | string[]) => {
    setActivePaletteKey(keys);
  };

  if (!paletteColorMixtures.size) {
    return <EmptyPalette />;
  }

  return (
    <>
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
