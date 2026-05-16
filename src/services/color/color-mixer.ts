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

import {getSortHueKey, getSortLightness} from '~/src/services/color/colors';
import {gcd} from '~/src/services/math/gcd';
import type {ExtractorComparator} from '~/src/utils/array';
import {createExtractorComparator, unique} from '~/src/utils/array';
import {
  by,
  byDate,
  byLength,
  byNumber,
  byString,
  type Comparator,
  compare,
  reverseOrder,
} from '~/src/utils/comparator';
import type {Fraction} from '~/src/utils/fraction';
import {not} from '~/src/utils/predicate';

import {Reflectance} from './space/reflectance';
import type {RgbTuple} from './space/rgb';
import {hexToRgb, rgbEqual, rgbToHex} from './space/rgb';
import type {
  Color,
  ColorId,
  ColorMixingConfig,
  ColorMixture,
  ColorMixturePart,
  ColorSet,
  SimilarColor,
} from './types';
import {ColorOpacity, ColorType, Layering} from './types';

export const COLOR_MIXING: Record<ColorType, ColorMixingConfig> = {
  [ColorType.WatercolorPaint]: {
    mixing: true,
    tint: false,
    layering: Layering.Always,
  },
  [ColorType.Gouache]: {
    mixing: true,
    tint: true,
    layering: Layering.None,
  },
  [ColorType.AcrylicGouache]: {
    mixing: true,
    tint: true,
    layering: Layering.None,
  },
  [ColorType.OilPaint]: {
    mixing: true,
    tint: true,
    layering: Layering.Always,
  },
  [ColorType.AcrylicPaint]: {
    mixing: true,
    tint: true,
    layering: Layering.Always,
  },
  [ColorType.ColoredPencils]: {
    mixing: false,
    tint: false,
    layering: Layering.Always,
  },
  [ColorType.WatercolorPencils]: {
    mixing: false,
    tint: false,
    layering: Layering.Always,
  },
  [ColorType.DryPastel]: {
    mixing: false,
    tint: false,
    layering: Layering.OverColorOnly,
  },
  [ColorType.OilPastel]: {
    mixing: false,
    tint: false,
    layering: Layering.OverColorOnly,
  },
  [ColorType.WaxPastel]: {
    mixing: false,
    tint: false,
    layering: Layering.OverColorOnly,
  },
  [ColorType.AcrylicMarkers]: {
    mixing: false,
    tint: false,
    layering: Layering.None,
  },
};

export const MIXABLE_COLOR_TYPES: ColorType[] = Object.entries(COLOR_MIXING)
  .filter(([_, {mixing}]) => mixing)
  .map(([colorType, _]) => Number(colorType) as ColorType);

export const MAX_COLORS_IN_MIXTURE: Record<2 | 3, number> = {
  2: Number.MAX_VALUE,
  3: 24,
};

const MATCHING_LIMITS: Record<1 | 2 | 3, [number, number][]> = {
  1: [[1, 3]],
  2: [
    [1, 1],
    [2, 3],
  ],
  3: [
    [1, 1],
    [2, 2],
    [3, 3],
  ],
};

export const NONE: Fraction = [0, 1];
export const WHOLE: Fraction = [1, 1];
export const FRACTIONS: Fraction[] = [
  [1, 8],
  [1, 4],
  [1, 2],
  [3, 4],
];

export function isFullStrength({
  consistency: [colorPart, whole],
}: {
  consistency: Fraction;
}): boolean {
  return colorPart === whole;
}

export const PAPER_WHITE_HEX = '#F7F5EF';
export const PAPER_WHITE: RgbTuple = hexToRgb(PAPER_WHITE_HEX);

type WithHash<T> = T & {hash: string};

const compareColorMixturePartsByParts: Comparator<ColorMixturePart> = reverseOrder(
  byNumber(({part}) => part)
);

const compareColorMixturePartsByColors = (
  {color: a}: ColorMixturePart,
  {color: b}: ColorMixturePart
): number => a.brand - b.brand || a.id - b.id;

export const compareColorMixturesByName: Comparator<ColorMixture> = compare(
  byString(({name}) => name),
  reverseOrder(byDate(({date}) => date))
);

export const compareColorMixturesByConsistency: Comparator<ColorMixture> = (
  {consistency: [aColorPart, aWhole]}: ColorMixture,
  {consistency: [bColorPart, bWhole]}: ColorMixture
) => bColorPart / bWhole - aColorPart / aWhole;

export const compareSimilarColorsBySimilarity: Comparator<SimilarColor> = reverseOrder(
  byNumber(({similarity}) => similarity)
);

export const compareSimilarColorsByColorMixturePartLength: Comparator<SimilarColor> = compare(
  byLength(({colorMixture: {parts}}) => parts),
  compareSimilarColorsBySimilarity
);

export const compareSimilarColorsByConsistency: Comparator<SimilarColor> = compare(
  by(({colorMixture}) => colorMixture, compareColorMixturesByConsistency),
  compareSimilarColorsBySimilarity
);

export enum ColorMixtureSort {
  ByDate = 1,
  ByName = 2,
  ByHue = 3,
  ByLightness = 4,
}

export const COLOR_MIXTURES_COMPARATORS: Record<
  ColorMixtureSort,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ExtractorComparator<ColorMixture, any>
> = {
  [ColorMixtureSort.ByDate]: createExtractorComparator<ColorMixture>(
    reverseOrder(byDate(({date}) => date))
  ),
  [ColorMixtureSort.ByName]: createExtractorComparator<ColorMixture>(compareColorMixturesByName),
  [ColorMixtureSort.ByHue]: createExtractorComparator<ColorMixture, [number, number, number]>(
    compare(
      byNumber(([group]: [number, number, number]) => group),
      byNumber(([, secondary]: [number, number, number]) => secondary),
      byNumber(([, , tertiary]: [number, number, number]) => tertiary)
    ),
    ({layerRgb}) => getSortHueKey(layerRgb)
  ),
  [ColorMixtureSort.ByLightness]: createExtractorComparator<ColorMixture, [number, number, number]>(
    compare(
      reverseOrder(byNumber(([lightness]: [number, number, number]) => lightness)),
      reverseOrder(byNumber(([, chroma]: [number, number, number]) => chroma)),
      byNumber(([, , hue]: [number, number, number]) => hue)
    ),
    ({layerRgb}) => getSortLightness(layerRgb)
  ),
};

class UnmixedColor {
  color: Color;
  rgb: RgbTuple;
  reflectance: Reflectance;

  constructor(color: Color) {
    this.color = color;
    this.rgb = color.rgb;
    this.reflectance = Reflectance.fromArray(color.rho);
  }

  toMixedColor(): MixedColor {
    return MixedColor.fromUnmixedColor(this);
  }
}

class MixedColor {
  rgb: RgbTuple;

  constructor(
    public reflectance: Reflectance,
    public parts: ColorMixturePart[]
  ) {
    this.rgb = reflectance.toRgbTuple();
  }

  includes([brandId, colorId]: ColorId): boolean {
    return this.parts.some(({color: {brand, id}}) => brand === brandId && id === colorId);
  }

  toMixedColorTint(): MixedColorTint {
    return MixedColorTint.fromMixedColor(this);
  }

  static fromUnmixedColor({color, reflectance}: UnmixedColor): MixedColor {
    return new MixedColor(reflectance, [{color, part: 1}]);
  }
}

class MixedColorTint {
  rgb: RgbTuple;

  constructor(
    public reflectance: Reflectance,
    public color: MixedColor,
    public whiteFraction: Fraction,
    public white?: UnmixedColor | null
  ) {
    this.rgb = reflectance.toRgbTuple();
  }

  toMixedColorLayer(): MixedColorLayer {
    return MixedColorLayer.fromMixedColorTint(this);
  }

  static fromMixedColor(color: MixedColor): MixedColorTint {
    return new MixedColorTint(color.reflectance, color, NONE);
  }
}

class SubstrateLayer {
  rgb: RgbTuple;
  hex: string;
  reflectance: Reflectance;

  constructor(rgb: RgbTuple) {
    this.rgb = rgb;
    this.hex = rgbToHex(...rgb);
    this.reflectance = Reflectance.fromRgb(...rgb);
  }
}

class MixedColorLayer {
  rgb: RgbTuple;

  constructor(
    public reflectance: Reflectance,
    public colorTint: MixedColorTint,
    public consistency: Fraction,
    public underlayer?: SubstrateLayer | null
  ) {
    this.rgb = reflectance.toRgbTuple();
  }

  toColorMixture(type: ColorType): ColorMixture {
    const {
      rgb: tintRgb,
      color: {rgb: colorMixtureRgb, parts},
      white,
      whiteFraction,
    } = this.colorTint;
    const underlayerRgb: RgbTuple | undefined = this.underlayer?.rgb;
    const underlayerHex: string | undefined = this.underlayer?.hex;
    return {
      key: getColorMixtureKey(
        type,
        parts,
        white?.color,
        whiteFraction,
        this.consistency,
        underlayerHex
      ),
      type,
      colorMixtureRgb,
      parts,
      whiteFraction,
      white: white?.color,
      tintRgb,
      consistency: this.consistency,
      underlayerRgb,
      layerRgb: this.rgb,
      layerRho: this.reflectance.toArray(),
    };
  }

  static fromMixedColorTint(color: MixedColorTint) {
    return new MixedColorLayer(color.reflectance, color, WHOLE);
  }
}

function getColorMixtureKey(
  type: ColorType,
  parts: ColorMixturePart[],
  white: Color | null | undefined,
  whiteFraction: Fraction,
  consistency: Fraction,
  underlayerHex: string | null | undefined
): string {
  return [
    type,
    parts.map(({color: {brand, id}, part}: ColorMixturePart) => `${brand}-${id}x${part}`).join(','),
    white ? `${white.brand}-${white.id}x${whiteFraction.join('/')}` : '0',
    consistency.join('/'),
    underlayerHex,
  ]
    .filter(Boolean)
    .join(';');
}

function getColorMixtureHash({parts}: ColorMixture): string {
  return parts
    .slice()
    .sort(compareColorMixturePartsByColors)
    .map(({color: {brand, id}}: ColorMixturePart) => `${brand}_${id}`)
    .join('-');
}

function mixColors(colors: UnmixedColor[], ratios: number[]): MixedColor {
  if (!colors.length) {
    throw new Error('Colors array is empty');
  }
  if (colors.length !== ratios.length) {
    throw new Error(`Colors size must match ratios size: ${colors.length} != ${ratios.length}`);
  }
  const parts: ColorMixturePart[] = [];
  const reflectances: Reflectance[] = [];
  for (let i = 0; i < colors.length; i++) {
    const {color, reflectance} = colors[i]!;
    parts.push({color, part: ratios[i]!});
    reflectances.push(reflectance);
  }
  const reflectance = Reflectance.mixKM(reflectances, ratios);
  parts.sort(compareColorMixturePartsByParts);
  return new MixedColor(reflectance, parts);
}

function toUnmixedColors(colors: Color[]): UnmixedColor[] {
  return colors.flatMap((color: Color) => new UnmixedColor(color));
}

function toUnmixedColorsAndWhites(
  unmixedColors: UnmixedColor[],
  tint = true
): [UnmixedColor[], UnmixedColor[]] {
  const whites = unmixedColors.filter(isWhiteColor);
  whites.sort(
    (
      {color: {opacity: aOpacity = ColorOpacity.Opaque, rho: aRho}}: UnmixedColor,
      {color: {opacity: bOpacity = ColorOpacity.Opaque, rho: bRho}}: UnmixedColor
    ) =>
      aOpacity - bOpacity ||
      Reflectance.fromArray(bRho).calculateSimilarity(Reflectance.WHITE) -
        Reflectance.fromArray(aRho).calculateSimilarity(Reflectance.WHITE)
  );
  return [unmixedColors.filter(not(isWhiteColor)), tint ? whites.slice(0, 1) : []];
}

function isWhiteColor({color: {name}}: UnmixedColor) {
  return name.toLowerCase().split(' ').includes('white');
}

function mixTwoColors(colors: UnmixedColor[]): MixedColor[] {
  const ratios: number[][] = [];
  const total = 8;
  for (let a = 1; a < total; a++) {
    const part1 = a;
    const part2 = total - a;
    const divisor = gcd(part1, part2);
    ratios.push([part1 / divisor, part2 / divisor]);
  }
  const mixedColors: MixedColor[] = [];
  for (let i = 0; i < colors.length - 1; i++) {
    const color1 = colors[i]!;
    for (let j = i + 1; j < colors.length; j++) {
      const color2 = colors[j]!;
      ratios.forEach(ratio => {
        mixedColors.push(mixColors([color1, color2], ratio));
      });
    }
  }
  return mixedColors;
}

function mixThreeColors(colors: UnmixedColor[]): MixedColor[] {
  const ratios: number[][] = [];
  const total = 9;
  for (let a = 1; a < total; a++) {
    for (let b = 1; a + b < total; b++) {
      const part1 = a;
      const part2 = b;
      const part3 = total - a - b;
      const divisor = gcd(part1, part2, part3);
      ratios.push([part1 / divisor, part2 / divisor, part3 / divisor]);
    }
  }
  const mixedColors: MixedColor[] = [];
  for (let i = 0; i < colors.length - 2; i++) {
    const color1 = colors[i]!;
    for (let j = i + 1; j < colors.length - 1; j++) {
      const color2 = colors[j]!;
      for (let k = j + 1; k < colors.length; k++) {
        const color3 = colors[k]!;
        ratios.forEach(ratio => {
          mixedColors.push(mixColors([color1, color2, color3], ratio));
        });
      }
    }
  }
  return mixedColors;
}

function mixTints(colors: MixedColor[], whites: UnmixedColor[]): MixedColorTint[] {
  const result: MixedColorTint[] = [];
  for (const color of colors) {
    for (const white of whites) {
      const colorReflectance = color.reflectance;
      const whiteReflectance = white.reflectance;
      for (const [colorPart, whole] of FRACTIONS) {
        const whitePart = whole - colorPart;
        const mixedReflectance = Reflectance.mixKM(
          [colorReflectance, whiteReflectance],
          [colorPart, whitePart]
        );
        const mixedColorTint = new MixedColorTint(
          mixedReflectance,
          color,
          [whitePart, whole],
          white
        );
        result.push(mixedColorTint);
      }
    }
  }
  return result;
}

function makeTintLayers(colors: MixedColor[], whites: UnmixedColor[]): MixedColorLayer[] {
  return mixTints(colors, whites).map(tint => tint.toMixedColorLayer());
}

function toMixedColorLayers(colors: MixedColor[]): MixedColorLayer[] {
  return colors.map(color => color.toMixedColorTint().toMixedColorLayer());
}

function isTransparentLayeringSupported(
  type: ColorType,
  underlayer: SubstrateLayer | null
): boolean {
  const {layering} = COLOR_MIXING[type];
  return layering === Layering.Always || (layering === Layering.OverColorOnly && !!underlayer);
}

function makeTransparentLayers(
  type: ColorType,
  colors: MixedColor[],
  underlayer: SubstrateLayer | null,
  surface: SubstrateLayer,
  fractions: Fraction[] | null
): MixedColorLayer[] {
  if (!colors.length || !fractions?.length || !isTransparentLayeringSupported(type, underlayer)) {
    return [];
  }
  const effectiveUnderlayer: SubstrateLayer = underlayer ?? surface;
  const result: MixedColorLayer[] = new Array<MixedColorLayer>();
  for (const color of colors) {
    const tint = color.toMixedColorTint();
    for (const [colorPart, whole] of fractions) {
      const mixedReflectance = Reflectance.mixKM(
        [color.reflectance, effectiveUnderlayer.reflectance],
        [colorPart, whole - colorPart]
      );
      const layer = new MixedColorLayer(
        mixedReflectance,
        tint,
        [colorPart, whole],
        effectiveUnderlayer
      );
      result.push(layer);
    }
  }
  return result;
}

function findSimilarColors(
  reflectance: Reflectance,
  mixedColorLayersArray: MixedColorLayer[][],
  type: ColorType,
  limit = 1,
  minSimilarity = 0,
  motherColorId?: ColorId | null
): SimilarColor[] {
  let similarColors: WithHash<SimilarColor>[] = [];
  for (const layers of mixedColorLayersArray) {
    for (const layer of layers) {
      const {
        colorTint: {color},
      } = layer;
      if (motherColorId && (color.parts.length === 1 || !color.includes(motherColorId))) {
        continue;
      }
      const similarity: number = layer.reflectance.calculateSimilarity(reflectance);
      if (minSimilarity > 0 && similarity <= minSimilarity) {
        continue;
      }
      if (
        similarColors.length < limit ||
        (similarColors.length > 0 &&
          similarity >= similarColors[similarColors.length - 1]!.similarity)
      ) {
        const colorMixture = layer.toColorMixture(type);
        const similarColor = {
          colorMixture,
          similarity,
          hash: getColorMixtureHash(colorMixture),
        };
        similarColors.push(similarColor);
        similarColors.sort(compareSimilarColorsBySimilarity);
        similarColors = unique(similarColors, ({hash}) => hash).slice(0, limit);
      }
    }
  }
  return similarColors;
}

export function makeSingleColorMixture(type: ColorType, color: Color): ColorMixture {
  return new UnmixedColor(color)
    .toMixedColor()
    .toMixedColorTint()
    .toMixedColorLayer()
    .toColorMixture(type);
}

export function makeColorMixture(
  type: ColorType,
  colors: Color[],
  ratio: number[],
  underlayerRgb: RgbTuple | null,
  surfaceRgb: RgbTuple,
  fractions: Fraction[] | null
): ColorMixture[] {
  const mixedColor: MixedColor = mixColors(toUnmixedColors(colors), ratio);
  const opaqueLayer: ColorMixture = mixedColor
    .toMixedColorTint()
    .toMixedColorLayer()
    .toColorMixture(type);
  const transparentLayers: ColorMixture[] = makeTransparentLayers(
    type,
    [mixedColor],
    underlayerRgb && new SubstrateLayer(underlayerRgb),
    new SubstrateLayer(surfaceRgb),
    fractions
  ).map((layer: MixedColorLayer): ColorMixture => layer.toColorMixture(type));
  return [opaqueLayer, ...transparentLayers];
}

export function isMixable(type: ColorType): boolean {
  return MIXABLE_COLOR_TYPES.includes(type);
}

export class ColorMixer {
  private colorSet?: ColorSet;
  private mixedColors: [number, MixedColor[]][] = [];
  private opaqueLayers = new Map<number, MixedColorLayer[]>();
  private tintLayers = new Map<number, MixedColorLayer[]>();
  private transparentLayers = new Map<number, MixedColorLayer[]>();
  private surface = new SubstrateLayer(PAPER_WHITE);
  private underlayer: SubstrateLayer | null = null;

  setColorSet(colorSet: ColorSet, underlayerRgb: RgbTuple | null, surfaceRgb: RgbTuple): void {
    this.colorSet = colorSet;
    this.mixColors();
    this.underlayer = underlayerRgb ? new SubstrateLayer(underlayerRgb) : null;
    this.surface = new SubstrateLayer(surfaceRgb);
    this.makeTransparentLayers();
  }

  setUnderlayer(underlayerRgb: RgbTuple | null): void {
    this.underlayer = underlayerRgb ? new SubstrateLayer(underlayerRgb) : null;
    this.makeTransparentLayers();
  }

  setSurface(surfaceRgb: RgbTuple): void {
    this.surface = new SubstrateLayer(surfaceRgb);
    if (!this.underlayer) {
      this.makeTransparentLayers();
    }
  }

  private getEffectiveUnderlayer(): SubstrateLayer {
    return this.underlayer ?? this.surface;
  }

  private mixColors(): void {
    console.time('mix-colors');
    const {type, colors} = this.colorSet!;
    const {mixing, tint} = COLOR_MIXING[type];
    const unmixedColors = toUnmixedColors(colors);
    const [unmixedColorsWithoutWhites, whites] = toUnmixedColorsAndWhites(unmixedColors, tint);
    this.mixedColors = [
      [1, unmixedColors.map(color => color.toMixedColor())],
      [
        2,
        mixing && colors.length <= MAX_COLORS_IN_MIXTURE[2]
          ? mixTwoColors(unmixedColorsWithoutWhites)
          : [],
      ],
      [
        3,
        mixing && colors.length <= MAX_COLORS_IN_MIXTURE[3]
          ? mixThreeColors(unmixedColorsWithoutWhites)
          : [],
      ],
    ];
    this.mixedColors.forEach(([numOfColors, colors]) => {
      console.log(`mixed colors (${numOfColors}): ${colors.length}`);
    });
    console.timeEnd('mix-colors');
    console.time('make-opaque-layers');
    this.opaqueLayers = new Map(
      this.mixedColors.map(([numOfColors, colors]) => [numOfColors, toMixedColorLayers(colors)])
    );
    console.timeEnd('make-opaque-layers');
    console.time('make-tint-layers');
    this.tintLayers = new Map(
      this.mixedColors.map(([numOfColors, colors]) => {
        const layers = makeTintLayers(colors, whites);
        console.log(`color tints (${numOfColors}): ${layers.length}`);
        return [numOfColors, layers];
      })
    );
    console.timeEnd('make-tint-layers');
  }

  private makeTransparentLayers(): void {
    if (!this.colorSet) {
      return;
    }
    console.time('make-transparent-layers');
    const {type} = this.colorSet;
    this.transparentLayers = new Map(
      this.mixedColors.map(([numOfColors, colors]) => {
        const layers = makeTransparentLayers(
          type,
          colors,
          this.underlayer,
          this.surface,
          FRACTIONS
        );
        console.log(`transparent color layers (${numOfColors}): ${layers.length}`);
        return [numOfColors, layers];
      })
    );
    console.timeEnd('make-transparent-layers');
  }

  private getMatchingLimits(): [number, number][] {
    const {type, colors} = this.colorSet!;
    const {mixing} = COLOR_MIXING[type];
    const maxNumOfColors: keyof typeof MATCHING_LIMITS =
      ([3, 2] as (keyof typeof MAX_COLORS_IN_MIXTURE)[]).find(
        numOfColors => mixing && colors.length <= MAX_COLORS_IN_MIXTURE[numOfColors]
      ) ?? 1;
    return MATCHING_LIMITS[maxNumOfColors];
  }

  findSimilarColors(
    targetColor: RgbTuple,
    includeTransparentLayers: boolean,
    motherColorId?: ColorId | null
  ): SimilarColor[] {
    const effectiveUnderlayer = this.getEffectiveUnderlayer();
    if (!this.colorSet || rgbEqual(...effectiveUnderlayer.rgb, ...targetColor)) {
      return [];
    }
    const {type} = this.colorSet;
    const reflectance = Reflectance.fromRgb(...targetColor);
    const result = [
      this.opaqueLayers,
      this.tintLayers,
      includeTransparentLayers ? this.transparentLayers : null,
    ].flatMap((layers: Map<number, MixedColorLayer[]> | null): SimilarColor[] => {
      if (!layers) {
        return [];
      }
      let minSimilarity = 0;
      return this.getMatchingLimits().flatMap(([numOfColors, limit]) => {
        const similarColors = findSimilarColors(
          reflectance,
          [layers.get(numOfColors)!],
          type,
          limit,
          minSimilarity,
          motherColorId
        );
        minSimilarity = similarColors[0]?.similarity ?? minSimilarity;
        return similarColors;
      });
    });
    result.sort(compareSimilarColorsBySimilarity);
    return result;
  }

  findSimilarColor(
    targetColor: RgbTuple,
    includeTransparentLayers: boolean,
    motherColorId?: ColorId | null
  ): SimilarColor | undefined {
    const [similarColor] = this.findSimilarColorBulk(
      [targetColor],
      includeTransparentLayers,
      motherColorId
    );
    return similarColor;
  }

  findSimilarColorBulk(
    targetColors: RgbTuple[],
    includeTransparentLayers: boolean,
    motherColorId?: ColorId | null
  ): (SimilarColor | undefined)[] {
    if (!this.colorSet) {
      return [];
    }
    const {type} = this.colorSet;
    const effectiveUnderlayer = this.getEffectiveUnderlayer();
    return targetColors.map(targetColor => {
      if (rgbEqual(...effectiveUnderlayer.rgb, ...targetColor)) {
        return;
      }
      const [similarColor] = findSimilarColors(
        Reflectance.fromRgb(...targetColor),
        [
          ...this.opaqueLayers.values(),
          ...this.tintLayers.values(),
          ...(includeTransparentLayers ? this.transparentLayers.values() : []),
        ],
        type,
        1,
        0,
        motherColorId
      );
      return similarColor;
    });
  }
}
