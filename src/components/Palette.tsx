/**
 * ArtistAssistApp
 * Copyright (C) 2023-2026  Eugene Khyst
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

import {Plural, useLingui} from '@lingui/react/macro';
import {Tabs, Typography} from 'antd';
import type {TabsProps} from 'antd/lib';
import {useCallback, useEffect, useState} from 'react';

import {LoadingIndicator} from '~/src/components/loading/LoadingIndicator';
import {COLOR_TYPE_LABELS} from '~/src/components/messages';
import {COLOR_TYPES} from '~/src/services/color/colors';
import type {ColorMixture, ColorType} from '~/src/services/color/types';
import {useAppStore} from '~/src/stores/app-store';
import type {ArrayElement} from '~/src/utils/array';

import {ColorSwatchDrawer} from './color/ColorSwatchDrawer';
import {EmptyPalette} from './empty/EmptyPalette';
import {PaletteGrid} from './palette/PaletteGrid';

type ItemType = ArrayElement<TabsProps['items']>;

export const Palette: React.FC = () => {
  const colorSetColorType = useAppStore(state => state.colorSet?.type);
  const paletteColorMixtures = useAppStore(state => state.paletteColorMixtures);
  const isPaletteLoading = useAppStore(state => state.isPaletteLoading);

  const {t} = useLingui();

  const [activePaletteKey, setActivePaletteKey] = useState<string>();

  const [colorSwatchColorMixtures, setColorSwatchColorMixtures] = useState<
    ColorMixture[] | undefined
  >();
  const [isOpenColorSwatch, setIsOpenColorSwatch] = useState<boolean>(false);

  const isLoading: boolean = isPaletteLoading;

  useEffect(() => {
    if (colorSetColorType) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActivePaletteKey(colorSetColorType.toString());
    }
  }, [colorSetColorType]);

  const showColorSwatch = useCallback((colorMixtures: ColorMixture[]) => {
    setColorSwatchColorMixtures(colorMixtures);
    setIsOpenColorSwatch(true);
  }, []);

  const items: ItemType[] = COLOR_TYPES.map((colorType: ColorType): ItemType | undefined => {
    const mixtures = paletteColorMixtures.get(colorType);
    if (!mixtures?.size && colorType !== colorSetColorType) {
      return;
    }
    const colorCount: number = mixtures?.size ?? 0;
    return {
      key: colorType.toString(),
      label: (
        <>
          <Typography.Text strong>{t(COLOR_TYPE_LABELS[colorType])}</Typography.Text>{' '}
          <Typography.Text>
            <Plural value={colorCount} one="# color" other="# colors" />
          </Typography.Text>
        </>
      ),
      children: mixtures?.size ? (
        <PaletteGrid colorType={colorType} showColorSwatch={showColorSwatch} />
      ) : (
        <EmptyPalette />
      ),
    };
  }).filter((item): item is ItemType => !!item);

  const handleTabChange = (keys: string) => {
    setActivePaletteKey(keys);
  };

  if (!paletteColorMixtures.size) {
    return <EmptyPalette />;
  }

  return (
    <LoadingIndicator loading={isLoading}>
      <div style={{padding: '0 16px 16px'}}>
        <Tabs
          items={items}
          activeKey={activePaletteKey}
          onChange={handleTabChange}
          size="small"
          tabBarGutter={0}
        />
      </div>
      <ColorSwatchDrawer
        colorMixtures={colorSwatchColorMixtures}
        open={isOpenColorSwatch}
        onClose={() => {
          setIsOpenColorSwatch(false);
        }}
      />
    </LoadingIndicator>
  );
};
