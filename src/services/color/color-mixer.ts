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

import {gcd} from '~/src/services/math/gcd';
import {unique} from '~/src/utils/array';
import type {Comparator} from '~/src/utils/comparator';
import type {Fraction} from '~/src/utils/fraction';
import {not} from '~/src/utils/predicate';

import {Reflectance} from './space/reflectance';
import type {RgbTuple} from './space/rgb';
import {Rgb} from './space/rgb';
import type {
  Color,
  ColorMixingConfig,
  ColorMixture,
  ColorMixturePart,
  ColorSet,
  SimilarColor,
} from './types';
import {ColorOpacity, ColorType} from './types';

export const COLOR_MIXING: Record<ColorType, ColorMixingConfig> = {
  [ColorType.WatercolorPaint]: {
    mixing: true,
    tint: false,
    glazing: true,
    wash: true,
  },
  [ColorType.Gouache]: {
    mixing: true,
    tint: true,
    glazing: false,
    wash: false,
  },
  [ColorType.AcrylicGouache]: {
    mixing: true,
    tint: true,
    glazing: false,
    wash: false,
  },
  [ColorType.OilPaint]: {
    mixing: true,
    tint: true,
    glazing: true,
    wash: true,
  },
  [ColorType.AcrylicPaint]: {
    mixing: true,
    tint: true,
    glazing: true,
    wash: true,
  },
  [ColorType.ColoredPencils]: {
    mixing: false,
    tint: false,
    glazing: true,
    wash: true,
  },
  [ColorType.WatercolorPencils]: {
    mixing: false,
    tint: false,
    glazing: true,
    wash: true,
  },
  [ColorType.Pastel]: {
    mixing: false,
    tint: false,
    glazing: true,
    wash: false,
  },
  [ColorType.OilPastel]: {
    mixing: false,
    tint: false,
    glazing: true,
    wash: false,
  },
  [ColorType.AcrylicMarkers]: {
    mixing: false,
    tint: false,
    glazing: false,
    wash: false,
  },
};

export const MIXABLE_COLOR_TYPES: ColorType[] = Object.entries(COLOR_MIXING)
  .filter(([_, {mixing}]) => mixing)
  .map(([colorType, _]) => parseInt(colorType) as ColorType);

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

const NONE: Fraction = [0, 1];
const WHOLE: Fraction = [1, 1];
const FRACTIONS: Fraction[] = [
  [1, 8],
  [1, 4],
  [1, 2],
  [3, 4],
];

export const PAPER_WHITE_HEX = '#F7F5EF';
export const PAPER_WHITE = Rgb.fromHex(PAPER_WHITE_HEX);

type WithHash<T> = T & {hash: string};

class UnmixedColor {
  color: Color;
  rgb: Rgb;
  reflectance: Reflectance;

  constructor(color: Color) {
    this.color = color;
    this.rgb = new Rgb(...color.rgb);
    this.reflectance = Reflectance.fromArray(color.rho);
  }

  toMixedColor(): MixedColor {
    return MixedColor.fromUnmixedColor(this);
  }
}

class MixedColor {
  rgb: Rgb;

  constructor(
    public reflectance: Reflectance,
    public parts: ColorMixturePart[]
  ) {
    this.rgb = reflectance.toRgb();
  }

  toMixedColorTint(): MixedColorTint {
    return MixedColorTint.fromMixedColor(this);
  }

  static fromUnmixedColor({color, reflectance}: UnmixedColor): MixedColor {
    return new MixedColor(reflectance, [{color, part: 1}]);
  }
}

class MixedColorTint {
  rgb: Rgb;

  constructor(
    public reflectance: Reflectance,
    public color: MixedColor,
    public whiteFraction: Fraction,
    public white?: UnmixedColor | null
  ) {
    this.rgb = reflectance.toRgb();
  }

  toMixedColorLayer(): MixedColorLayer {
    return MixedColorLayer.fromMixedColorTint(this);
  }

  static fromMixedColor(color: MixedColor): MixedColorTint {
    return new MixedColorTint(color.reflectance, color, NONE);
  }
}

class Background {
  rgb: Rgb;
  hex: string;
  reflectance: Reflectance;

  constructor(rgb: Rgb) {
    this.rgb = rgb;
    this.hex = rgb.toHex();
    this.reflectance = rgb.toReflectance();
  }
}

class MixedColorLayer {
  rgb: Rgb;

  constructor(
    public reflectance: Reflectance,
    public colorTint: MixedColorTint,
    public consistency: Fraction,
    public background?: Background | null
  ) {
    this.rgb = reflectance.toRgb();
  }

  toColorMixture(type: ColorType): ColorMixture {
    const {
      rgb: tintRgb,
      color: {rgb: colorMixtureRgb, parts},
      white,
      whiteFraction,
    } = this.colorTint;
    const backgroundRgb: RgbTuple | undefined = this.background?.rgb.toTuple();
    const backgroundHex: string | undefined = this.background?.hex;
    return {
      key: getColorMixtureKey(
        type,
        parts,
        white?.color,
        whiteFraction,
        this.consistency,
        backgroundHex
      ),
      type,
      colorMixtureRgb: colorMixtureRgb.toTuple(),
      parts,
      whiteFraction,
      white: white?.color,
      tintRgb: tintRgb.toTuple(),
      consistency: this.consistency,
      backgroundRgb,
      layerRgb: this.rgb.toTuple(),
      layerRho: this.reflectance.toArray(),
    };
  }

  static fromMixedColorTint(color: MixedColorTint) {
    return new MixedColorLayer(color.reflectance, color, WHOLE);
  }
}

const compareColorMixturePartsByParts = (
  {part: a}: ColorMixturePart,
  {part: b}: ColorMixturePart
): number => a - b;

const compareColorMixturePartsByColors = (
  {color: a}: ColorMixturePart,
  {color: b}: ColorMixturePart
): number => a.brand - b.brand || a.id - b.id;

export const compareColorMixturesByDate = (
  {date: a}: ColorMixture,
  {date: b}: ColorMixture
): number => (a?.getTime() ?? 0) - (b?.getTime() ?? 0);

export const compareColorMixturesByName = (a: ColorMixture, b: ColorMixture): number => {
  if (!a.name && !b.name) {
    return -1 * compareColorMixturesByDate(a, b);
  }
  if (!a.name) {
    return 1;
  }
  if (!b.name) {
    return -1;
  }
  return a.name.localeCompare(b.name);
};

export const compareColorMixturesByConsistency: Comparator<ColorMixture> = (
  {consistency: [aColorPart, aWhole]}: ColorMixture,
  {consistency: [bColorPart, bWhole]}: ColorMixture
) => bColorPart / bWhole - aColorPart / aWhole;

export const compareSimilarColorsBySimilarity: Comparator<SimilarColor> = (
  {similarity: a}: SimilarColor,
  {similarity: b}: SimilarColor
) => b - a;

export const compareSimilarColorsByColorMixturePartLength: Comparator<SimilarColor> = (
  {colorMixture: {parts: aParts}, similarity: aSim}: SimilarColor,
  {colorMixture: {parts: bParts}, similarity: bSim}: SimilarColor
) => aParts.length - bParts.length || bSim - aSim;

export const compareSimilarColorsByConsistency: Comparator<SimilarColor> = (
  {colorMixture: aColorMixture, similarity: aSim}: SimilarColor,
  {colorMixture: bColorMixture, similarity: bSim}: SimilarColor
) => compareColorMixturesByConsistency(aColorMixture, bColorMixture) || bSim - aSim;

function getColorMixtureKey(
  type: ColorType,
  parts: ColorMixturePart[],
  white: Color | null | undefined,
  whiteFraction: Fraction,
  consistency: Fraction,
  backgroundHex: string | null | undefined
): string {
  return [
    type,
    parts.map(({color: {brand, id}, part}: ColorMixturePart) => `${brand}-${id}x${part}`).join(','),
    white ? `${white.brand}-${white.id}x${whiteFraction.join('/')}` : '0',
    consistency.join('/'),
    backgroundHex,
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

export function isThickConsistency({
  consistency: [colorPart, whole],
}: {
  consistency: Fraction;
}): boolean {
  return colorPart === whole;
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
  parts.reverse();
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
  const tints = mixTints(colors, whites);
  const result: MixedColorLayer[] = new Array<MixedColorLayer>(tints.length);
  for (let i = 0; i < tints.length; i++) {
    result[i] = tints[i]!.toMixedColorLayer();
  }
  return result;
}

function toMixedColorLayers(colors: MixedColor[]): MixedColorLayer[] {
  const result: MixedColorLayer[] = new Array<MixedColorLayer>(colors.length);
  for (let i = 0; i < colors.length; i++) {
    result[i] = colors[i]!.toMixedColorTint().toMixedColorLayer();
  }
  return result;
}

function makeThinnedLayers(
  colors: MixedColor[],
  background?: Background,
  layering = true
): MixedColorLayer[] {
  if (!colors.length || !background || !layering) {
    return toMixedColorLayers(colors);
  }
  const result: MixedColorLayer[] = new Array<MixedColorLayer>();
  for (const color of colors) {
    const tint = color.toMixedColorTint();
    result.push(tint.toMixedColorLayer());
    for (const [colorPart, whole] of FRACTIONS) {
      const mixedReflectance = Reflectance.mixKM(
        [color.reflectance, background.reflectance],
        [colorPart, whole - colorPart]
      );
      const layer = new MixedColorLayer(mixedReflectance, tint, [colorPart, whole], background);
      result.push(layer);
    }
  }
  return result;
}

function isFirstLayer({rgb}: Background): boolean {
  return PAPER_WHITE.equals(rgb);
}

function findSimilarColors(
  reflectance: Reflectance,
  mixedColorLayersArr: MixedColorLayer[][],
  type: ColorType,
  limit = 1,
  minSimilarity = 0
): SimilarColor[] {
  let similarColors: WithHash<SimilarColor>[] = [];
  for (const layers of mixedColorLayersArr) {
    for (const layer of layers) {
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

export function makeColorMixture(
  type: ColorType,
  colors: Color[],
  ratio: number[],
  backgroundColor: string
): ColorMixture[] {
  const mixedColors: MixedColor[] = [mixColors(toUnmixedColors(colors), ratio)];
  const background = new Background(Rgb.fromHex(backgroundColor));
  const {glazing, wash} = COLOR_MIXING[type];
  const layering = isFirstLayer(background) ? wash : glazing;
  const layers: MixedColorLayer[] = [
    ...makeTintLayers(mixedColors, []),
    ...makeThinnedLayers(mixedColors, background, layering),
  ];
  return layers.map((layer: MixedColorLayer): ColorMixture => layer.toColorMixture(type));
}

export function isMixable(type: ColorType): boolean {
  return MIXABLE_COLOR_TYPES.includes(type);
}

export function isPastel(type: ColorType): boolean {
  return type === ColorType.Pastel || type === ColorType.OilPastel;
}

export class ColorMixer {
  private colorSet?: ColorSet;
  private mixedColors: [number, MixedColor[]][] = [];
  private tintLayers = new Map<number, MixedColorLayer[]>();
  private thinnedLayers = new Map<number, MixedColorLayer[]>();
  private background = new Background(PAPER_WHITE);

  setColorSet(colorSet: ColorSet, backgroundColor: string) {
    this.colorSet = colorSet;
    this.mixColors();
    this.setBackgroundColor(backgroundColor);
  }

  setBackgroundColor(backgroundColor: string) {
    this.background = new Background(Rgb.fromHex(backgroundColor));
    this.makeThinnedLayers();
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
    console.time('make-tints');
    this.tintLayers = new Map(
      this.mixedColors.map(([numOfColors, colors]) => {
        const layers = makeTintLayers(colors, whites);
        console.log(`color tints (${numOfColors}): ${layers.length}`);
        return [numOfColors, layers];
      })
    );
    console.timeEnd('make-tints');
  }

  private makeThinnedLayers(): void {
    console.time('make-thinned-layers');
    const {type} = this.colorSet!;
    const {glazing, wash} = COLOR_MIXING[type];
    const layering = isFirstLayer(this.background) ? wash : glazing;
    this.thinnedLayers = new Map(
      this.mixedColors.map(([numOfColors, colors]) => {
        const layers = makeThinnedLayers(colors, this.background, layering);
        console.log(`thinned color layers (${numOfColors}): ${layers.length}`);
        return [numOfColors, layers];
      })
    );
    console.timeEnd('make-thinned-layers');
  }

  findSimilarColor(targetColor: RgbTuple): SimilarColor | undefined {
    const rgb = new Rgb(...targetColor);
    if (!this.colorSet || this.background.rgb.equals(rgb)) {
      return;
    }
    const {type} = this.colorSet;
    const reflectance = rgb.toReflectance();
    const [similarColor] = findSimilarColors(
      reflectance,
      [...this.tintLayers.values(), ...this.thinnedLayers.values()],
      type,
      1
    );
    return similarColor;
  }

  findSimilarColors(targetColor: string): SimilarColor[] {
    const rgb = Rgb.fromHex(targetColor);
    if (!this.colorSet || this.background.rgb.equals(rgb)) {
      return [];
    }
    const {type, colors} = this.colorSet;
    const {mixing} = COLOR_MIXING[type];
    const maxNumOfColors =
      ([3, 2] as (2 | 3)[]).find(
        numOfColors => mixing && colors.length <= MAX_COLORS_IN_MIXTURE[numOfColors]
      ) ?? 1;
    const matchingLimits = MATCHING_LIMITS[maxNumOfColors];
    const reflectance = rgb.toReflectance();
    const similarColors = [this.tintLayers, this.thinnedLayers].flatMap(layers => {
      let minSimilarity = 0;
      return matchingLimits.flatMap(([numOfColors, limit]) => {
        const similarColors = findSimilarColors(
          reflectance,
          [layers.get(numOfColors)!],
          type,
          limit,
          minSimilarity
        );
        minSimilarity = similarColors[0]?.similarity ?? minSimilarity;
        return similarColors;
      });
    });
    similarColors.sort(compareSimilarColorsBySimilarity);
    return similarColors;
  }
}
