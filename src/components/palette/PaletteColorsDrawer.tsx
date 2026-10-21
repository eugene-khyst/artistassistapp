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

import {
  type Color,
  COLOR_COMPARATORS,
  type ColorBrandDefinition,
  type ColorMixture,
  ColorSort,
  type ColorType,
  decorateSortUndecorate,
  rgbToHex,
} from '@eugene-khyst/artistassistapp-color-mixer';
import {Trans, useLingui} from '@lingui/react/macro';
import {Drawer, Empty, Flex, Tag, Typography} from 'antd';
import {useMemo} from 'react';

import {ColorLabel} from '@/components/color/ColorLabel';
import {ColorSquare} from '@/components/color/ColorSquare';
import {TONAL_VALUE_LABELS} from '@/components/messages';
import {TonalValueFilter} from '@/components/tonal-value/TonalValueFilter';
import {useColorBrands} from '@/hooks/useColorBrands';
import {compareColorBrandsByName} from '@/services/color/colors';
import {useAppStore} from '@/stores/app-store';
import {groupBy} from '@/utils/array';

interface ColorsByBrand {
  known: [ColorBrandDefinition, Color[]][];
  unknown: Color[];
}

interface Props {
  colorType: ColorType;
  colorMixtures: ColorMixture[];
  open: boolean;
  onClose: () => void;
}

export function PaletteColorsDrawer({colorType, colorMixtures, open, onClose}: Readonly<Props>) {
  const selectedTonalValue = useAppStore(state => state.selectedTonalValue);

  const {brands} = useColorBrands(colorType);

  const {t} = useLingui();

  const {known, unknown} = useMemo((): ColorsByBrand => {
    if (!brands) {
      return {known: [], unknown: []};
    }
    const colors = new Map<string, Color>(
      colorMixtures
        .flatMap(({parts, white}) => [...parts.map(({color}) => color), ...(white ? [white] : [])])
        .map(color => [`${color.brand}-${color.id}`, color])
    );
    const compareBrands = compareColorBrandsByName({prioritizeFreeTier: false});
    return {
      known: [...groupBy([...colors.values()], ({brand}) => brands.get(brand))]
        .sort(([a], [b]) => compareBrands(a, b))
        .map(([brand, brandColors]) => [
          brand,
          decorateSortUndecorate(brandColors, COLOR_COMPARATORS[ColorSort.ById]),
        ]),
      unknown: [...colors.values()]
        .filter(({brand}) => !brands.has(brand))
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  }, [brands, colorMixtures]);

  const tonalValueLabel =
    selectedTonalValue === null ? null : t(TONAL_VALUE_LABELS[selectedTonalValue]);

  return (
    <Drawer
      title={<TonalValueFilter />}
      placement="right"
      size="default"
      open={open}
      onClose={onClose}
    >
      <Flex vertical gap="middle">
        <Flex vertical gap="small" align="start">
          <Typography.Text type="secondary">
            <Trans>Colors needed for this palette</Trans>
          </Typography.Text>
          {tonalValueLabel !== null && <Tag>{tonalValueLabel}</Tag>}
        </Flex>
        {!colorMixtures.length && (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={<Trans>No color mixtures match the filter</Trans>}
          />
        )}
        {known.map(([brand, colors]) => (
          <Flex key={brand.id} vertical gap="small">
            <Typography.Text strong>{brand.shortName || brand.fullName}</Typography.Text>
            {colors.map(color => (
              <ColorLabel key={color.id} color={color} brand={brand} />
            ))}
          </Flex>
        ))}
        {!!unknown.length && (
          <Flex vertical gap="small">
            <Typography.Text strong>
              <Trans>Unknown brand</Trans>
            </Typography.Text>
            {unknown.map(({brand, id, name, rgb}) => (
              <Flex key={`${brand}-${id}`} gap="small" align="center">
                <ColorSquare hex={rgbToHex(...rgb)} />
                <Typography.Text>{name}</Typography.Text>
              </Flex>
            ))}
          </Flex>
        )}
      </Flex>
    </Drawer>
  );
}
