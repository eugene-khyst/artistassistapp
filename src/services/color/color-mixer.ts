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

import {gcd} from '~/src/services/math';
import type {Fraction} from '~/src/utils';
import {not, unique} from '~/src/utils';

import type {RgbTuple} from './space';
import {Reflectance, Rgb} from './space';
import type {
  Color,
  ColorMixingConfig,
  ColorMixture,
  ColorMixturePart,
  ColorSet,
  SimilarColor,
} from './types';
import {ColorType} from './types';

export const COLOR_MIXING: Record<ColorType, ColorMixingConfig> = {
  [ColorType.WatercolorPaint]: {
    maxColors: 3,
    tint: false,
    glazing: true,
  },
  [ColorType.Gouache]: {
    maxColors: 3,
    tint: true,
    glazing: false,
  },
  [ColorType.AcrylicGouache]: {
    maxColors: 3,
    tint: true,
    glazing: false,
  },
  [ColorType.OilPaint]: {
    maxColors: 3,
    tint: true,
    glazing: true,
  },
  [ColorType.AcrylicPaint]: {
    maxColors: 3,
    tint: true,
    glazing: true,
  },
  [ColorType.ColoredPencils]: {
    maxColors: 1,
    tint: false,
    glazing: true,
  },
  [ColorType.WatercolorPencils]: {
    maxColors: 1,
    tint: false,
    glazing: true,
  },
};

const NONE: Fraction = [0, 1];
const WHOLE: Fraction = [1, 1];
const FRACTIONS: Fraction[] = [
  [1, 10],
  [1, 4],
  [1, 2],
  [3, 4],
];

export const THREE_COLORS_MIXTURES_LIMIT = 28;

export const PAPER_WHITE_HEX = 'F7F5EF';

const SIMILAR_COLORS_LIMITS: [number, number][] = [
  [1, 1],
  [2, 2],
  [3, 3],
];

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
  reflectance: Reflectance;

  constructor(rgb: Rgb) {
    this.rgb = rgb;
    this.reflectance = rgb.toReflectance();
  }
}

class MixedColorLayer {
  rgb: Rgb;

  constructor(
    public reflectance: Reflectance,
    public colorTint: MixedColorTint,
    public consistency: Fraction,
    public background?: Rgb | null
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
    const backgroundRgb: RgbTuple | undefined = this.background?.toRgbTuple();
    return {
      key: getColorMixtureKey(type, parts, this.consistency, backgroundRgb),
      type,
      colorMixtureRgb: colorMixtureRgb.toRgbTuple(),
      parts,
      whiteFraction,
      white: white?.color,
      tintRgb: tintRgb.toRgbTuple(),
      consistency: this.consistency,
      backgroundRgb,
      layerRgb: this.rgb.toRgbTuple(),
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

export const compareColorMixturesByConsistency = (
  {consistency: [aColorPart, aWhole]}: ColorMixture,
  {consistency: [bColorPart, bWhole]}: ColorMixture
) => bColorPart / bWhole - aColorPart / aWhole;

export const compareSimilarColorsBySimilarity = (
  {similarity: a}: SimilarColor,
  {similarity: b}: SimilarColor
) => b - a;

export const compareSimilarColorsByColorMixturePartLength = (
  {colorMixture: {parts: aParts}, similarity: aSim}: SimilarColor,
  {colorMixture: {parts: bParts}, similarity: bSim}: SimilarColor
) => aParts.length - bParts.length || bSim - aSim;

export const compareSimilarColorsByConsistency = (
  {colorMixture: aColorMixture, similarity: aSim}: SimilarColor,
  {colorMixture: bColorMixture, similarity: bSim}: SimilarColor
) => compareColorMixturesByConsistency(aColorMixture, bColorMixture) || bSim - aSim;

function getColorMixtureKey(
  type: ColorType,
  parts: ColorMixturePart[],
  consistency: Fraction,
  background?: RgbTuple | null
): string {
  return [
    type,
    parts.map(({color: {brand, id}, part}: ColorMixturePart) => `${brand}-${id}x${part}`).join(','),
    consistency.join(':'),
    ...(background ? [new Rgb(...background).toHex()] : []),
  ].join(';');
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
  parts.sort(compareColorMixturePartsByParts).reverse();
  return new MixedColor(reflectance, parts);
}

function toUnmixedColors(colors: Color[]): UnmixedColor[] {
  return colors.flatMap((color: Color) => new UnmixedColor(color));
}

function toUnmixedColorsAndWhites(colors: Color[], tint = true): [UnmixedColor[], UnmixedColor[]] {
  const unmixedColors: UnmixedColor[] = toUnmixedColors(colors);
  return [unmixedColors.filter(not(isWhiteColor)), tint ? unmixedColors.filter(isWhiteColor) : []];
}

function isWhiteColor({color: {name}}: UnmixedColor) {
  return name.toLowerCase().split(' ').includes('white');
}

function mixTwoColors(colors: UnmixedColor[]): MixedColor[] {
  const ratios: number[][] = [];
  for (let a = 1; a < 10; a++) {
    const part1 = a;
    const part2 = 10 - a;
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
  for (let a = 1; a < 9; a++) {
    for (let b = 1; a + b < 9; b++) {
      const part1 = a;
      const part2 = b;
      const part3 = 9 - a - b;
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
  return colors.flatMap((color: MixedColor): MixedColorTint[] =>
    whites.flatMap((white: UnmixedColor): MixedColorTint[] =>
      FRACTIONS.map(([colorPart, whole]: Fraction): MixedColorTint => {
        const whitePart = whole - colorPart;
        return new MixedColorTint(
          Reflectance.mixKM([color.reflectance, white.reflectance], [colorPart, whitePart]),
          color,
          [whitePart, whole],
          white
        );
      })
    )
  );
}

function makeTintLayers(colors: MixedColor[], whites: UnmixedColor[]): MixedColorLayer[] {
  return mixTints(colors, whites).map(color => color.toMixedColorLayer());
}

function makeThinnedLayers(
  colors: MixedColor[],
  background?: Background,
  glazing = true
): MixedColorLayer[] {
  if (!colors.length || !background || !glazing) {
    return colors.map(color => color.toMixedColorTint().toMixedColorLayer());
  }
  const {rgb: backgroundRgb, reflectance: backgroundReflectance} = background;
  return colors.flatMap((color: MixedColor): MixedColorLayer[] => [
    color.toMixedColorTint().toMixedColorLayer(),
    ...FRACTIONS.map(
      ([colorPart, whole]: Fraction): MixedColorLayer =>
        new MixedColorLayer(
          Reflectance.mixKM(
            [color.reflectance, backgroundReflectance],
            [colorPart, whole - colorPart]
          ),
          color.toMixedColorTint(),
          [colorPart, whole],
          backgroundRgb
        )
    ),
  ]);
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
      const colorMixture = layer.toColorMixture(type);
      similarColors.push({
        colorMixture,
        similarity,
        hash: getColorMixtureHash(colorMixture),
      });
      similarColors.sort(compareSimilarColorsBySimilarity);
      similarColors = unique(similarColors, ({hash}) => hash).slice(0, limit);
    }
  }
  return similarColors;
}

export function makeColorMixture(
  type: ColorType,
  colors: Color[],
  ratio: number[],
  backgroundColorHex: string
): ColorMixture[] {
  const mixedColors: MixedColor[] = [mixColors(toUnmixedColors(colors), ratio)];
  const background = new Background(Rgb.fromHex(backgroundColorHex));
  const {glazing = true} = COLOR_MIXING[type];
  const layers: MixedColorLayer[] = [
    ...makeTintLayers(mixedColors, []),
    ...makeThinnedLayers(mixedColors, background, glazing),
  ];
  return layers.map((layer: MixedColorLayer): ColorMixture => layer.toColorMixture(type));
}

export class ColorMixer {
  private type?: ColorType;
  private mixedColors: [number, MixedColor[]][] = [];
  private tintLayers = new Map<number, MixedColorLayer[]>();
  private thinnedLayers = new Map<number, MixedColorLayer[]>();
  private background?: Background;

  setColorSet(colorSet: ColorSet, backgroundColor: string | RgbTuple) {
    this.type = colorSet.type;
    this.mixColors(colorSet);
    this.setBackgroundColor(backgroundColor);
  }

  setBackgroundColor(backgroundColor: string | RgbTuple) {
    this.background = new Background(Rgb.fromHexOrTuple(backgroundColor));
    this.makeThinnedLayers();
  }

  private mixColors({type, colors}: ColorSet): void {
    console.time('mix-colors');
    const {maxColors, tint = false} = COLOR_MIXING[type];
    const [unmixedColors, whites] = toUnmixedColorsAndWhites(colors, tint);
    this.mixedColors = [
      [1, unmixedColors.map(color => color.toMixedColor())],
      [2, maxColors >= 2 ? mixTwoColors(unmixedColors) : []],
      [
        3,
        maxColors >= 3 && colors.length <= THREE_COLORS_MIXTURES_LIMIT
          ? mixThreeColors(unmixedColors)
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
    const {glazing = true} = this.type ? COLOR_MIXING[this.type] : {};
    this.thinnedLayers = new Map(
      this.mixedColors.map(([numOfColors, colors]) => {
        const layers = makeThinnedLayers(colors, this.background, glazing);
        console.log(`thinned color layers (${numOfColors}): ${layers.length}`);
        return [numOfColors, layers];
      })
    );
    console.timeEnd('make-thinned-layers');
  }

  findSimilarColor(targetColor: string | RgbTuple): SimilarColor | undefined {
    const rgb = Rgb.fromHexOrTuple(targetColor);
    if (!this.type || this.background?.rgb.equals(rgb)) {
      return;
    }
    const reflectance = rgb.toReflectance();
    return findSimilarColors(
      reflectance,
      [...this.tintLayers.values(), ...this.thinnedLayers.values()],
      this.type,
      1
    )[0];
  }

  findSimilarColors(targetColor: string | RgbTuple): SimilarColor[] {
    const rgb = Rgb.fromHexOrTuple(targetColor);
    if (!this.type || this.background?.rgb.equals(rgb)) {
      return [];
    }
    const reflectance = rgb.toReflectance();
    const similarColors = [this.tintLayers, this.thinnedLayers].flatMap(layers => {
      let minSimilarity = 0;
      return SIMILAR_COLORS_LIMITS.flatMap(([numOfColors, limit]) => {
        const similarColors = findSimilarColors(
          reflectance,
          [layers.get(numOfColors)!],
          this.type!,
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
