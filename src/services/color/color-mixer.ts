/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Paint, PaintBrand, PaintOpacity, PaintSet, PaintType} from '.';
import {unique} from '../../utils';
import {gcd} from '../math';
import {Lab, Reflectance, Rgb, RgbTuple} from './model';

export interface PaintMixingConfig {
  maxPaintsCount: 1 | 2 | 3;
  onlyThickConsistency: boolean;
}

export const PAINT_MIXING: Record<PaintType, PaintMixingConfig> = {
  [PaintType.WatercolorPaint]: {
    maxPaintsCount: 3,
    onlyThickConsistency: false,
  },
  [PaintType.OilPaint]: {
    maxPaintsCount: 3,
    onlyThickConsistency: true,
  },
  [PaintType.AcrylicPaint]: {
    maxPaintsCount: 3,
    onlyThickConsistency: true,
  },
  [PaintType.ColoredPencils]: {
    maxPaintsCount: 1,
    onlyThickConsistency: false,
  },
  [PaintType.WatercolorPencils]: {
    maxPaintsCount: 1,
    onlyThickConsistency: false,
  },
};

export type PaintConsistency = [paint: number, fluid: number];

const CONSISTENCIES: PaintConsistency[] = [
  [1, 9],
  [1, 3],
  [1, 1],
  [3, 1],
  [1, 0],
];

export const PAPER_WHITE_HEX: string = 'F7F5EF';

export interface PaintFractionDefinition {
  brand: PaintBrand;
  id: number;
  fraction: number;
}

export interface PaintMixDefinition {
  type: PaintType;
  name: string | null;
  fractions: PaintFractionDefinition[];
  consistency: PaintConsistency;
  background: RgbTuple | null;
}

export interface PaintFraction {
  paint: Paint;
  fraction: number;
}

export interface Pipet {
  x: number;
  y: number;
  diameter: number;
}

export interface PaintMix {
  id: string;
  name?: string | null;
  type: PaintType;
  paintMixRgb: RgbTuple;
  paintMixRho: number[];
  fractions: PaintFraction[];
  consistency: PaintConsistency;
  backgroundRgb: RgbTuple | null;
  paintMixLayerRgb: RgbTuple;
  imageFileId?: number;
  pipet?: Pipet;
  dataIndex?: number;
}

export interface SimilarColor {
  paintMix: PaintMix;
  deltaE: number;
}

class UnmixedPaint {
  paint: Paint;
  rgb: Rgb;
  lab: Lab;
  reflectance: Reflectance;

  constructor(paint: Paint) {
    this.paint = paint;
    this.rgb = new Rgb(...paint.rgb);
    this.lab = this.rgb.toXyz().toLab();
    this.reflectance = Reflectance.fromArray(paint.rho);
  }
}

class MixedPaint {
  rgb: Rgb;

  constructor(
    public type: PaintType,
    public reflectance: Reflectance,
    public fractions: PaintFraction[]
  ) {
    this.rgb = reflectance.toRgb();
  }

  isOpaque(): boolean {
    return this.fractions.some(
      ({paint}: PaintFraction) =>
        paint.opacity === PaintOpacity.Opaque || paint.opacity === PaintOpacity.SemiOpaque
    );
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

class PaintLayer {
  lab: Lab;

  constructor(
    public rgb: Rgb,
    public paint: MixedPaint,
    public consistency: PaintConsistency,
    public background: Rgb | null
  ) {
    this.lab = this.rgb.toXyz().toLab();
  }

  toPaintMix(): PaintMix {
    const {type, fractions, rgb, reflectance} = this.paint;
    const backgroundRgb: RgbTuple | null = this.background?.toRgbTuple() ?? null;
    return {
      id: getPaintMixId(type, fractions, this.consistency, backgroundRgb),
      type,
      paintMixRgb: rgb.toRgbTuple(),
      paintMixRho: reflectance.toArray(),
      fractions,
      consistency: this.consistency,
      backgroundRgb,
      paintMixLayerRgb: this.rgb.toRgbTuple(),
    };
  }
}

const comparePaintFractionsByFraction = (
  {fraction: a}: PaintFraction,
  {fraction: b}: PaintFraction
): number => b - a;

const comparePaintFractionsByPaints = (
  {paint: a}: PaintFraction,
  {paint: b}: PaintFraction
): number => a.brand - b.brand || a.id - b.id;

export const comparePaintMixesByDataIndex = (
  {dataIndex: a}: PaintMix,
  {dataIndex: b}: PaintMix
): number => (b ?? 0) - (a ?? 0);

export const comparePaintMixesByName = (a: PaintMix, b: PaintMix): number => {
  if (!a.name && !b.name) {
    return comparePaintMixesByDataIndex(a, b);
  }
  if (!a.name) {
    return 1;
  }
  if (!b.name) {
    return -1;
  }
  return a.name.localeCompare(b.name);
};

export const comparePaintMixesByConsistency = (
  {consistency: [aPaint, aFluid]}: PaintMix,
  {consistency: [bPaint, bFluid]}: PaintMix
) => aFluid - bFluid || bPaint - aPaint;

export const compareSimilarColorsByDeltaE = (
  {deltaE: a}: SimilarColor,
  {deltaE: b}: SimilarColor
) => a - b;

export const compareSimilarColorsByPaintMixFractionsLength = (a: SimilarColor, b: SimilarColor) =>
  a.paintMix.fractions.length - b.paintMix.fractions.length || a.deltaE - b.deltaE;

function getPaintMixId(
  type: PaintType,
  fractions: PaintFraction[],
  consistency: PaintConsistency,
  background: RgbTuple | null
): string {
  return (
    type +
    ';' +
    fractions
      .map(({paint: {brand, id}, fraction}: PaintFraction) => `${brand}-${id}x${fraction}`)
      .join(',') +
    ';' +
    consistency.join(':') +
    (background ? ';' + new Rgb(...background).toHex() : '')
  );
}

function getPaintMixHash({fractions}: PaintMix): string {
  return fractions
    .slice()
    .sort(comparePaintFractionsByPaints)
    .map(({paint: {brand, id}}: PaintFraction) => brand + '_' + id)
    .join('-');
}

export function isThickConsistency({consistency: [_, fluid]}: PaintMix): boolean {
  return fluid === 0;
}

export function createPaintMix(
  {type, name, fractions: fractionsDefinitions, consistency, background}: PaintMixDefinition,
  paints: Map<PaintBrand, Map<number, Paint>>
): PaintMix | null {
  const paintFractions: PaintFraction[] = fractionsDefinitions.flatMap(
    ({brand, id, fraction}: PaintFractionDefinition): PaintFraction[] => {
      const paint: Paint | undefined = paints.get(brand)?.get(id);
      return paint ? [{paint, fraction}] : [];
    }
  );
  if (!paintFractions.length) {
    return null;
  }
  const id: string = getPaintMixId(type, paintFractions, consistency, background);
  const reflectances: Reflectance[] = paintFractions.map(({paint: {rho}}: PaintFraction) =>
    Reflectance.fromArray(rho)
  );
  const fractions: number[] = paintFractions.map(({fraction}: PaintFraction) => fraction);
  const paintMixRho: Reflectance = Reflectance.mixSubtractively(reflectances, fractions);
  const paintMixRgb: Rgb = paintMixRho.toRgb();
  const paintMixLayerRho: Reflectance = background
    ? Reflectance.mixSubtractively(
        [paintMixRho, Reflectance.fromRgb(new Rgb(...background))],
        consistency
      )
    : paintMixRho;
  const paintMixLayerRgb: Rgb = background ? paintMixLayerRho.toRgb() : paintMixRgb;
  return {
    id,
    name,
    type,
    paintMixRgb: paintMixRgb.toRgbTuple(),
    paintMixRho: paintMixRho.toArray(),
    fractions: paintFractions,
    backgroundRgb: background,
    consistency: consistency,
    paintMixLayerRgb: paintMixLayerRgb.toRgbTuple(),
  };
}

function makePaintsConsistencies(
  paints: MixedPaint[],
  {rgb: background, reflectance: backgroundReflectance}: Background
): PaintLayer[] {
  return paints.flatMap((paint: MixedPaint): PaintLayer[] =>
    CONSISTENCIES.map((consistency: PaintConsistency): PaintLayer => {
      const [_, fluidFraction] = consistency;
      if (fluidFraction === 0) {
        return new PaintLayer(paint.rgb, paint, consistency, null);
      }
      const reflectance = Reflectance.mixSubtractively(
        [paint.reflectance, backgroundReflectance],
        consistency
      );
      return new PaintLayer(reflectance.toRgb(), paint, consistency, background);
    })
  );
}

function makePaintMix(paints: UnmixedPaint[], fractions: number[]): MixedPaint {
  if (!paints.length) {
    throw new Error('Paints array is empty');
  }
  if (paints.length !== fractions.length) {
    throw new Error(
      `The number of paints (${paints.length}}) != the number of fractions (${fractions.length})`
    );
  }
  const paintFractions: PaintFraction[] = [];
  const reflectances: Reflectance[] = [];
  for (let i = 0; i < paints.length; i++) {
    const {paint, reflectance} = paints[i];
    paintFractions.push({paint, fraction: fractions[i]});
    reflectances.push(reflectance);
  }
  const reflectance = Reflectance.mixSubtractively(reflectances, fractions);
  paintFractions.sort(comparePaintFractionsByFraction);
  return new MixedPaint(paints[0].paint.type, reflectance, paintFractions);
}

function makeOnePaintMixes(paints: UnmixedPaint[]): MixedPaint[] {
  return paints.flatMap(
    ({paint, reflectance}: UnmixedPaint) =>
      new MixedPaint(paint.type, reflectance, [{paint, fraction: 1}])
  );
}

function makeTwoPaintsMixes(paints: UnmixedPaint[]): MixedPaint[] {
  const fractionsArray: number[][] = [];
  for (let a = 1; a < 10; a++) {
    const fraction1 = a;
    const fraction2 = 10 - a;
    const divisor = gcd(fraction1, fraction2);
    fractionsArray.push([fraction1 / divisor, fraction2 / divisor]);
  }
  const mixedPaints: MixedPaint[] = [];
  for (let i = 0; i < paints.length - 1; i++) {
    const paint1 = paints[i];
    for (let j = i + 1; j < paints.length; j++) {
      const paint2 = paints[j];
      fractionsArray.forEach(fractions => {
        mixedPaints.push(makePaintMix([paint1, paint2], fractions));
      });
    }
  }
  return mixedPaints;
}

function makeThreePaintsMixes(paints: UnmixedPaint[]): MixedPaint[] {
  const fractionsArray: number[][] = [];
  for (let a = 1; a < 9; a++) {
    for (let b = 1; a + b < 9; b++) {
      const fraction1 = a;
      const fraction2 = b;
      const fraction3 = 9 - a - b;
      const divisor = gcd(fraction1, fraction2, fraction3);
      fractionsArray.push([fraction1 / divisor, fraction2 / divisor, fraction3 / divisor]);
    }
  }
  const mixedPaints: MixedPaint[] = [];
  for (let i = 0; i < paints.length - 2; i++) {
    const paint1 = paints[i];
    for (let j = i + 1; j < paints.length - 1; j++) {
      const paint2 = paints[j];
      for (let k = j + 1; k < paints.length; k++) {
        const paint3 = paints[k];
        fractionsArray.forEach(fractions => {
          mixedPaints.push(makePaintMix([paint1, paint2, paint3], fractions));
        });
      }
    }
  }
  return mixedPaints;
}

function uniqueSimilarColors(similarColors: SimilarColor[]): SimilarColor[] {
  return unique(similarColors, ({paintMix}: SimilarColor): string => getPaintMixHash(paintMix));
}

export function mixPaints(
  paints: Paint[],
  fractions: number[],
  backgroundColorHex: string
): PaintMix[] {
  const mixedPaint: MixedPaint = makePaintMix(
    paints.map((paint: Paint) => new UnmixedPaint(paint)),
    fractions
  );
  const paintLayers: PaintLayer[] = makePaintsConsistencies(
    [mixedPaint],
    new Background(Rgb.fromHex(backgroundColorHex))
  );
  return paintLayers.map((paintLayer: PaintLayer): PaintMix => paintLayer.toPaintMix());
}

export class ColorMixer {
  private paintType: PaintType | null = null;
  private paintMixes: Map<number, MixedPaint[]> = new Map();
  private paintMixLayers: Map<number, PaintLayer[]> = new Map();
  private background: Background | null = null;

  private async getUnmixedColors(paints: Paint[]): Promise<UnmixedPaint[]> {
    return paints.flatMap((paint: Paint) => new UnmixedPaint(paint));
  }

  async setPaintSet(paintSet: PaintSet) {
    this.paintType = paintSet.type;
    await this.mixPaints(paintSet);
    await this.makePaintsConsistencies();
  }

  async setBackground(backgroundColorHex: string) {
    this.background = new Background(Rgb.fromHex(backgroundColorHex));
    await this.makePaintsConsistencies();
  }

  private async mixPaints({type, colors: paints}: PaintSet): Promise<void> {
    if (process.env.NODE_ENV !== 'production') {
      console.time('mix-paints');
    }
    const unmixedColors: UnmixedPaint[] = await this.getUnmixedColors(paints);
    this.paintMixes.clear();
    const {maxPaintsCount} = PAINT_MIXING[type];
    this.paintMixes.set(1, makeOnePaintMixes(unmixedColors));
    if (maxPaintsCount >= 2) {
      this.paintMixes.set(2, makeTwoPaintsMixes(unmixedColors));
    }
    if (maxPaintsCount >= 3) {
      this.paintMixes.set(3, makeThreePaintsMixes(unmixedColors));
    }
    if (process.env.NODE_ENV !== 'production') {
      console.timeEnd('mix-paints');
    }
  }

  private async makePaintsConsistencies(): Promise<void> {
    if (!this.background) {
      return;
    }
    if (process.env.NODE_ENV !== 'production') {
      console.time('make-paints-consistencies');
    }
    this.paintMixLayers.clear();
    for (const [numOfPaints, paintMixes] of this.paintMixes) {
      this.paintMixLayers.set(numOfPaints, makePaintsConsistencies(paintMixes, this.background));
    }
    if (process.env.NODE_ENV !== 'production') {
      console.timeEnd('make-paints-consistencies');
    }
  }

  findSimilarColors(
    targetColor: string | RgbTuple,
    isGlaze = false,
    limitResultsForMixes = 5,
    deltaELimit = 2,
    bestMatchFallback = true,
    maxDeltaE = 10
  ): SimilarColor[] {
    const rgb = Rgb.fromHexOrTuple(targetColor);
    if (!this.paintType || this.background?.rgb.equals(rgb)) {
      return [];
    }
    const lab: Lab = rgb.toXyz().toLab();
    const {onlyThickConsistency} = PAINT_MIXING[this.paintType];
    const allSimilarColors: SimilarColor[] = [];
    let topNSimilarColors: SimilarColor[] = [];
    for (const layers of this.paintMixLayers.values()) {
      const similarColors: SimilarColor[] = [];
      for (const layer of layers) {
        const [_, fluidFraction] = layer.consistency;
        if (onlyThickConsistency && !isGlaze && fluidFraction !== 0) {
          continue;
        }
        if (isGlaze && (fluidFraction === 0 || layer.paint.isOpaque())) {
          continue;
        }
        const deltaE: number = layer.lab.getDeltaE2000(lab);
        if (maxDeltaE && deltaE > maxDeltaE) {
          continue;
        }
        const similarColor: SimilarColor = {
          paintMix: layer.toPaintMix(),
          deltaE,
        };
        if (bestMatchFallback && similarColors.length === 0) {
          topNSimilarColors.push(similarColor);
          topNSimilarColors.sort(compareSimilarColorsByDeltaE);
          topNSimilarColors = uniqueSimilarColors(topNSimilarColors);
          if (topNSimilarColors.length > limitResultsForMixes) {
            topNSimilarColors.pop();
          }
        }
        if (deltaE <= deltaELimit) {
          similarColors.push(similarColor);
        }
      }
      similarColors.sort(compareSimilarColorsByDeltaE);
      allSimilarColors.push(...uniqueSimilarColors(similarColors).slice(0, limitResultsForMixes));
    }
    allSimilarColors.sort(compareSimilarColorsByDeltaE);
    return allSimilarColors.length > 0 ? allSimilarColors : topNSimilarColors;
  }
}
