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
  COLOR_MIXING,
  type ColorMatch,
  type ColorMixture,
  type Comparator,
  compareColorMatchesByColorMixturePartLength,
  compareColorMatchesByConsistency,
  compareColorMatchesByMatchScore,
} from '@eugene-khyst/artistassistapp-color-mixer';
import {Flex} from 'antd';
import {useMemo} from 'react';

import {ColorMatchCard} from '@/components/color/ColorMatchCard';
import {PaletteColorMixtureCard} from '@/components/color/PaletteColorMixtureCard';
import {EmptyColorMatches} from '@/components/empty/EmptyColorMatches';
import {EmptyTargetColor} from '@/components/empty/EmptyTargetColor';
import {ColorPickerSort} from '@/services/settings/types';
import {useAppStore} from '@/stores/app-store';

import styles from './ColorMatchesList.module.css';

const COLOR_MATCH_COMPARATORS: Record<ColorPickerSort, Comparator<ColorMatch>> = {
  [ColorPickerSort.ByMatchScore]: compareColorMatchesByMatchScore,
  [ColorPickerSort.ByNumberOfColors]: compareColorMatchesByColorMixturePartLength,
  [ColorPickerSort.ByConsistency]: compareColorMatchesByConsistency,
};

interface Props {
  sort: ColorPickerSort;
  onReflectanceChartClick: (colorMixture?: ColorMixture) => void;
}

export function ColorMatchesList({sort, onReflectanceChartClick}: Readonly<Props>) {
  const colorType = useAppStore(state => state.colorSet?.type);
  const targetColorHex = useAppStore(state => state.targetColorHex);
  const underlayerHex = useAppStore(state => state.underlayerHex);
  const motherColorId = useAppStore(state => state.motherColorId);
  const colorMatches = useAppStore(state => state.colorMatches);
  const isColorMatchesLoading = useAppStore(state => state.isColorMatchesLoading);
  const selectedPaletteColorMixtures = useAppStore(state => state.selectedPaletteColorMixtures);

  const {mixing = false} = colorType ? COLOR_MIXING[colorType] : {};

  const sortedColorMatches = useMemo(() => {
    return colorMatches
      .slice()
      .sort(COLOR_MATCH_COMPARATORS[mixing ? sort : ColorPickerSort.ByMatchScore]);
  }, [colorMatches, sort, mixing]);

  if (!targetColorHex) {
    return <EmptyTargetColor />;
  }
  return (
    <Flex vertical gap="small" className="u-w-100">
      {[...selectedPaletteColorMixtures.values()].map(colorMixture => (
        <PaletteColorMixtureCard
          key={`selected-${colorMixture.key}`}
          colorMixture={colorMixture}
          showOnPhoto={false}
          className={styles['selectedPaletteCard']}
        />
      ))}
      {!isColorMatchesLoading && !colorMatches.length ? (
        <EmptyColorMatches hasUnderlayer={!!underlayerHex} hasUnifyingColor={!!motherColorId} />
      ) : (
        sortedColorMatches.map((colorMatch: ColorMatch) => (
          <ColorMatchCard
            key={colorMatch.colorMixture.key}
            targetColor={targetColorHex}
            colorMatch={colorMatch}
            onReflectanceChartClick={onReflectanceChartClick}
          />
        ))
      )}
    </Flex>
  );
}
