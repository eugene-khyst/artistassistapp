/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {gcd} from '~/src/services/math';
import type {Fraction} from '~/src/utils';
import {not, unique} from '~/src/utils';

import type {Color, ColorSet} from './colors';
import {ColorType} from './colors';
import type {Oklab, Oklch, RgbTuple} from './space';
import {Reflectance, Rgb} from './space';

export interface ColorMixingConfig {
  maxColors: 1 | 3;
  tint: boolean;
  glazing: boolean;
}

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

const CHROMA_LIMIT_1 = 0.135;
const CHROMA_LIMIT_2 = 0.02;

export const PAPER_WHITE_HEX: string = 'F7F5EF';

export interface ColorMixturePartDefinition {
  brand: number;
  id: number;
  part: number;
}

export interface ColorMixtureDefinition {
  type: ColorType;
  name: string | null;
  parts: ColorMixturePartDefinition[];
  consistency: Fraction;
  background: RgbTuple | null;
}

export interface ColorMixturePart {
  color: Color;
  part: number;
}

export interface SamplingArea {
  x: number;
  y: number;
  diameter: number;
}

export interface ColorMixture {
  id?: number;
  key: string;
  name?: string | null;
  type: ColorType;
  colorMixtureRgb: RgbTuple;
  colorMixtureRho: number[];
  parts: ColorMixturePart[];
  whiteFraction: Fraction;
  white?: Color | null;
  tintRgb: RgbTuple;
  consistency: Fraction;
  backgroundRgb?: RgbTuple | null;
  layerRgb: RgbTuple;
  imageFileId?: number | null;
  samplingArea?: SamplingArea | null;
  date?: Date | null;
}

export interface SimilarColor {
  colorMixture: ColorMixture;
  deltaE: number;
}

class UnmixedColor {
  color: Color;
  rgb: Rgb;
  oklch: Oklch;
  reflectance: Reflectance;

  constructor(color: Color) {
    this.color = color;
    this.rgb = new Rgb(...color.rgb);
    this.oklch = this.rgb.toOklab().toOklch();
    this.reflectance = Reflectance.fromArray(color.rho);
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

  static fromUnmixedColor = ({color, reflectance}: UnmixedColor): MixedColor => {
    return new MixedColor(reflectance, [{color, part: 1}]);
  };
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

  static fromMixedColor = (color: MixedColor): MixedColorTint => {
    return new MixedColorTint(color.reflectance, color, NONE);
  };
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
  oklab: Oklab;

  constructor(
    public rgb: Rgb,
    public color: MixedColorTint,
    public consistency: Fraction,
    public background?: Rgb | null
  ) {
    this.oklab = this.rgb.toOklab();
  }

  static fromMixedColorTint = (color: MixedColorTint) => {
    return new MixedColorLayer(color.rgb, color, WHOLE);
  };

  toColorMixture(type: ColorType): ColorMixture {
    const {
      rgb: tintRgb,
      color: {reflectance: colorMixtureReflectance, rgb: colorMixtureRgb, parts},
      white,
      whiteFraction,
    } = this.color;
    const backgroundRgb: RgbTuple | undefined = this.background?.toRgbTuple();
    return {
      key: getColorMixtureKey(type, parts, this.consistency, backgroundRgb),
      type,
      colorMixtureRgb: colorMixtureRgb.toRgbTuple(),
      colorMixtureRho: colorMixtureReflectance.toArray(),
      parts,
      whiteFraction,
      white: white?.color,
      tintRgb: tintRgb.toRgbTuple(),
      consistency: this.consistency,
      backgroundRgb,
      layerRgb: this.rgb.toRgbTuple(),
    };
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
) => Math.abs(aWhole - aColorPart) - Math.abs(bWhole - bColorPart);

export const compareSimilarColorsByDeltaE = (
  {deltaE: a}: SimilarColor,
  {deltaE: b}: SimilarColor
) => a - b;

export const compareSimilarColorsByColorMixturePartLength = (
  {colorMixture: {parts: aParts}, deltaE: aDeltaE}: SimilarColor,
  {colorMixture: {parts: bParts}, deltaE: bDeltaE}: SimilarColor
) => aParts.length - bParts.length || aDeltaE - bDeltaE;

export const compareSimilarColorsByConsistency = (
  {colorMixture: aColorMixture, deltaE: aDeltaE}: SimilarColor,
  {colorMixture: bColorMixture, deltaE: bDeltaE}: SimilarColor
) => compareColorMixturesByConsistency(aColorMixture, bColorMixture) || aDeltaE - bDeltaE;

function getColorMixtureKey(
  type: ColorType,
  parts: ColorMixturePart[],
  consistency: Fraction,
  background?: RgbTuple | null
): string {
  return (
    type +
    ';' +
    parts
      .map(({color: {brand, id}, part}: ColorMixturePart) => `${brand}-${id}x${part}`)
      .join(',') +
    ';' +
    consistency.join(':') +
    (background ? ';' + new Rgb(...background).toHex() : '')
  );
}

function getColorMixtureHash({parts}: ColorMixture): string {
  return parts
    .slice()
    .sort(compareColorMixturePartsByColors)
    .map(({color: {brand, id}}: ColorMixturePart) => brand + '_' + id)
    .join('-');
}

export function isThickConsistency({
  consistency: [colorPart, whole],
}: {
  consistency: Fraction;
}): boolean {
  return colorPart === whole;
}

export function createColorMixture(
  {type, name, parts: partDefs, consistency, background: backgroundRgb}: ColorMixtureDefinition,
  colors: Map<number, Map<number, Color>>
): ColorMixture | null {
  const parts: ColorMixturePart[] = partDefs
    .map(({brand, id, part}: ColorMixturePartDefinition): ColorMixturePart | undefined => {
      const color: Color | undefined = colors.get(brand)?.get(id);
      if (!color) {
        return;
      }
      return {color, part};
    })
    .filter((part): part is ColorMixturePart => !!part);
  if (!parts.length) {
    return null;
  }
  const key: string = getColorMixtureKey(type, parts, consistency, backgroundRgb);
  const reflectances: Reflectance[] = parts.map(({color: {rho}}: ColorMixturePart) =>
    Reflectance.fromArray(rho)
  );
  const ratio: number[] = parts.map(({part}: ColorMixturePart) => part);
  const colorMixtureReflectance: Reflectance = Reflectance.mixSubtractively(reflectances, ratio);
  const colorMixtureRgb: Rgb = colorMixtureReflectance.toRgb();
  const layerRho: Reflectance = backgroundRgb
    ? Reflectance.mixSubtractively(
        [colorMixtureReflectance, Reflectance.fromRgb(new Rgb(...backgroundRgb))],
        consistency
      )
    : colorMixtureReflectance;
  const layerRgb: Rgb = backgroundRgb ? layerRho.toRgb() : colorMixtureRgb;
  return {
    key,
    name,
    type,
    colorMixtureRgb: colorMixtureRgb.toRgbTuple(),
    colorMixtureRho: colorMixtureReflectance.toArray(),
    parts,
    whiteFraction: NONE,
    tintRgb: colorMixtureRgb.toRgbTuple(),
    consistency,
    backgroundRgb,
    layerRgb: layerRgb.toRgbTuple(),
  };
}

function makeThickLayers(colors: MixedColorTint[]): MixedColorLayer[] {
  return colors.map(MixedColorLayer.fromMixedColorTint);
}

function makeThinnedLayers(
  type: ColorType,
  colors: MixedColorTint[],
  {rgb: backgroundRgb, reflectance: backgroundReflectance}: Background
): MixedColorLayer[] {
  if (!colors.length) {
    return [];
  }
  const {glazing = true} = COLOR_MIXING[type];
  if (!glazing) {
    return [];
  }
  return colors.flatMap((color: MixedColorTint): MixedColorLayer[] =>
    FRACTIONS.map((consistency: Fraction): MixedColorLayer => {
      const reflectance = Reflectance.mixSubtractively(
        [color.reflectance, backgroundReflectance],
        consistency
      );
      return new MixedColorLayer(reflectance.toRgb(), color, consistency, backgroundRgb);
    })
  );
}

function makeLayers(type: ColorType, colors: MixedColorTint[], background: Background) {
  return [...makeThickLayers(colors), ...makeThinnedLayers(type, colors, background)];
}

function mixColors(colors: UnmixedColor[], ratio: number[]): MixedColor {
  if (!colors.length) {
    throw new Error('Colors array is empty');
  }
  if (colors.length !== ratio.length) {
    throw new Error(
      `The number of colors (${colors.length}}) != the number of parts (${ratio.length})`
    );
  }
  const parts: ColorMixturePart[] = [];
  const reflectances: Reflectance[] = [];
  for (let i = 0; i < colors.length; i++) {
    const {color, reflectance} = colors[i];
    parts.push({color, part: ratio[i]});
    reflectances.push(reflectance);
  }
  const reflectance = Reflectance.mixSubtractively(reflectances, ratio);
  parts.sort(compareColorMixturePartsByParts).reverse();
  return new MixedColor(reflectance, parts);
}

function toUnmixedColorsAndWhites(colors: Color[]): [UnmixedColor[], UnmixedColor[]] {
  const unmixedColors: UnmixedColor[] = colors.flatMap((color: Color) => new UnmixedColor(color));
  return [unmixedColors.filter(not(isWhiteColor)), unmixedColors.filter(isWhiteColor)];
}

function countByChromaLessThan(chroma: number, ...colors: UnmixedColor[]): number {
  return colors.filter(({oklch: {c}}: UnmixedColor) => c < chroma).length;
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
    const color1 = colors[i];
    for (let j = i + 1; j < colors.length; j++) {
      const color2 = colors[j];
      if (
        countByChromaLessThan(CHROMA_LIMIT_1, color1, color2) > 1 ||
        countByChromaLessThan(CHROMA_LIMIT_2, color1, color2) > 0
      ) {
        continue;
      }
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
    const color1 = colors[i];
    for (let j = i + 1; j < colors.length - 1; j++) {
      const color2 = colors[j];
      for (let k = j + 1; k < colors.length; k++) {
        const color3 = colors[k];
        if (countByChromaLessThan(CHROMA_LIMIT_1, color1, color2, color3) > 0) {
          continue;
        }
        ratios.forEach(ratio => {
          mixedColors.push(mixColors([color1, color2, color3], ratio));
        });
      }
    }
  }
  return mixedColors;
}

function isWhiteColor({color: {name}}: UnmixedColor) {
  return name.toLowerCase().split(' ').includes('white');
}

function mixTints(mixedColors: MixedColor[], whites: UnmixedColor[]): MixedColorTint[] {
  if (!whites.length) {
    return mixedColors.map(MixedColorTint.fromMixedColor);
  }
  return mixedColors.flatMap((mixedColor: MixedColor): MixedColorTint[] =>
    whites.flatMap((white: UnmixedColor): MixedColorTint[] =>
      FRACTIONS.map(([colorPart, whole]: Fraction): MixedColorTint => {
        const whitePart = whole - colorPart;
        return new MixedColorTint(
          Reflectance.mixSubtractively(
            [mixedColor.reflectance, white.reflectance],
            [colorPart, whitePart]
          ),
          mixedColor,
          [whitePart, whole],
          white
        );
      })
    )
  );
}

function uniqueSimilarColors(similarColors: SimilarColor[]): SimilarColor[] {
  return unique(similarColors, ({colorMixture}: SimilarColor): string =>
    getColorMixtureHash(colorMixture)
  );
}

export function makeColorMixture(
  type: ColorType,
  colors: Color[],
  ratio: number[],
  backgroundColorHex: string
): ColorMixture[] {
  const [unmixedColors] = toUnmixedColorsAndWhites(colors);
  const color: MixedColorTint = MixedColorTint.fromMixedColor(mixColors(unmixedColors, ratio));
  const layers: MixedColorLayer[] = makeLayers(
    type,
    [color],
    new Background(Rgb.fromHex(backgroundColorHex))
  );
  return layers.map((layer: MixedColorLayer): ColorMixture => layer.toColorMixture(type));
}

export class ColorMixer {
  private type?: ColorType;
  private colorMixtures: MixedColorTint[] = [];
  private thickLayers: MixedColorLayer[] = [];
  private thinnedLayers: MixedColorLayer[] = [];
  private background?: Background;

  setColorSet(colorSet: ColorSet, backgroundColor: string | RgbTuple) {
    this.type = colorSet.type;
    this.mixColors(colorSet);
    this.makeThickLayers();
    this.setBackgroundColor(backgroundColor);
  }

  setBackgroundColor(backgroundColor: string | RgbTuple) {
    this.background = new Background(Rgb.fromHexOrTuple(backgroundColor));
    this.makeThinnedLayers();
  }

  private mixColors({type, colors}: ColorSet): void {
    if (process.env.NODE_ENV !== 'production') {
      console.time('mix-colors');
    }
    const [unmixedColors, whites]: [UnmixedColor[], UnmixedColor[]] =
      toUnmixedColorsAndWhites(colors);
    const {maxColors, tint = false} = COLOR_MIXING[type];
    const mixedColors: MixedColor[] = unmixedColors
      .map(MixedColor.fromUnmixedColor)
      .concat(
        maxColors >= 2 ? mixTwoColors(unmixedColors) : [],
        maxColors >= 3 ? mixThreeColors(unmixedColors) : []
      );
    this.colorMixtures = tint
      ? mixTints(mixedColors, whites)
      : mixedColors.map(MixedColorTint.fromMixedColor);
    if (process.env.NODE_ENV !== 'production') {
      console.timeEnd('mix-colors');
    }
  }

  private makeThickLayers(): void {
    if (process.env.NODE_ENV !== 'production') {
      console.time('make-thick-layers');
    }
    this.thickLayers = makeThickLayers(this.colorMixtures);
    if (process.env.NODE_ENV !== 'production') {
      console.timeEnd('make-thick-layers');
    }
  }

  private makeThinnedLayers(): void {
    if (process.env.NODE_ENV !== 'production') {
      console.time('make-thinned-layers');
    }
    this.thinnedLayers =
      this.type && this.background
        ? makeThinnedLayers(this.type, this.colorMixtures, this.background)
        : [];
    if (process.env.NODE_ENV !== 'production') {
      console.timeEnd('make-thinned-layers');
    }
  }

  findSimilarColors(
    targetColor: string | RgbTuple,
    maxMixesPerGroup = 3,
    deltaEThreshold = 2,
    deltaELimit = 10
  ): SimilarColor[] {
    const rgb = Rgb.fromHexOrTuple(targetColor);
    if (!this.type || this.background?.rgb.equals(rgb)) {
      return [];
    }
    const oklab: Oklab = rgb.toOklab();
    const matchingColors: SimilarColor[] = [];
    let topNSimilarColors: SimilarColor[] = [];
    for (const layers of [this.thickLayers, this.thinnedLayers]) {
      const matchingColorsGroup: SimilarColor[] = [];
      for (const layer of layers) {
        const deltaE: number = layer.oklab.getDeltaEOk(oklab, 100);
        if (deltaELimit > 0 && deltaE > deltaELimit) {
          continue;
        }
        const similarColor: SimilarColor = {
          colorMixture: layer.toColorMixture(this.type),
          deltaE,
        };
        if (matchingColors.length === 0 && matchingColorsGroup.length === 0) {
          topNSimilarColors.push(similarColor);
          topNSimilarColors.sort(compareSimilarColorsByDeltaE);
          topNSimilarColors = uniqueSimilarColors(topNSimilarColors);
          if (topNSimilarColors.length > maxMixesPerGroup) {
            topNSimilarColors.pop();
          }
        }
        if (deltaE <= deltaEThreshold) {
          matchingColorsGroup.push(similarColor);
        }
      }
      matchingColorsGroup.sort(compareSimilarColorsByDeltaE);
      matchingColors.push(...uniqueSimilarColors(matchingColorsGroup).slice(0, maxMixesPerGroup));
    }
    matchingColors.sort(compareSimilarColorsByDeltaE);
    return matchingColors.length > 0 ? matchingColors : topNSimilarColors;
  }
}
