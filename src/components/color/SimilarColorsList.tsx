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

import {Space} from 'antd';
import {useMemo} from 'react';

import {PaletteColorMixtureCard} from '~/src/components/color/PaletteColorMixtureCard';
import {SimilarColorCard} from '~/src/components/color/SimilarColorCard';
import {EmptySimilarColors} from '~/src/components/empty/EmptySimilarColors';
import {EmptyTargetColor} from '~/src/components/empty/EmptyTargetColor';
import {
  COLOR_MIXING,
  compareSimilarColorsByColorMixturePartLength,
  compareSimilarColorsByConsistency,
  compareSimilarColorsBySimilarity,
} from '~/src/services/color/color-mixer';
import type {ColorMixture, SimilarColor} from '~/src/services/color/types';
import {ColorPickerSort} from '~/src/services/settings/types';
import {useAppStore} from '~/src/stores/app-store';
import type {Comparator} from '~/src/utils/comparator';

const SIMILAR_COLORS_COMPARATORS: Record<ColorPickerSort, Comparator<SimilarColor>> = {
  [ColorPickerSort.BySimilarity]: compareSimilarColorsBySimilarity,
  [ColorPickerSort.ByNumberOfColors]: compareSimilarColorsByColorMixturePartLength,
  [ColorPickerSort.ByConsistency]: compareSimilarColorsByConsistency,
};

interface Props {
  sort: ColorPickerSort;
  onReflectanceChartClick: (colorMixture?: ColorMixture) => void;
}

export function SimilarColorsList({sort, onReflectanceChartClick}: Readonly<Props>) {
  const colorType = useAppStore(state => state.colorSet?.type);
  const targetColorHex = useAppStore(state => state.targetColorHex);
  const similarColors = useAppStore(state => state.similarColors);
  const isSimilarColorsLoading = useAppStore(state => state.isSimilarColorsLoading);
  const selectedPaletteColorMixtures = useAppStore(state => state.selectedPaletteColorMixtures);

  const {mixing = false} = colorType ? COLOR_MIXING[colorType] : {};

  const sortedSimilarColors = useMemo(() => {
    return similarColors
      .slice()
      .sort(SIMILAR_COLORS_COMPARATORS[mixing ? sort : ColorPickerSort.BySimilarity]);
  }, [similarColors, sort, mixing]);

  if (!targetColorHex) {
    return <EmptyTargetColor />;
  }
  return (
    <Space orientation="vertical" style={{width: '100%'}}>
      {[...selectedPaletteColorMixtures.values()].map(colorMixture => (
        <PaletteColorMixtureCard
          key={`selected-${colorMixture.key}`}
          colorMixture={colorMixture}
          showOnPhoto={false}
          className="selected-palette-card"
        />
      ))}
      {!isSimilarColorsLoading && !similarColors.length ? (
        <EmptySimilarColors />
      ) : (
        sortedSimilarColors.map((similarColor: SimilarColor) => (
          <SimilarColorCard
            key={similarColor.colorMixture.key}
            targetColor={targetColorHex}
            similarColor={similarColor}
            onReflectanceChartClick={onReflectanceChartClick}
          />
        ))
      )}
    </Space>
  );
}
