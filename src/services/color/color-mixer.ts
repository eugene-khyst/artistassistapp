/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Paint, PaintBrand, PaintOpacity, PaintSet, PaintType} from '.';
import {unique} from '../../utils';
import {gcd} from '../math';
import {Lab, Reflectance, Rgb, RgbTuple} from './model';

const DELTA_E_LIMIT = 10;

type PaintConsistency = [paint: number, fluid: number];

const CONSISTENCIES: PaintConsistency[] = [
  [1, 9],
  [1, 3],
  [1, 1],
  [3, 1],
  [1, 0],
];

const OFF_WHITE: Rgb = new Rgb(250, 249, 246);
export const OFF_WHITE_HEX: string = OFF_WHITE.toHex();

export interface ColorPickerSettings {
  sampleDiameter: number;
}

export interface PaintFraction {
  paint: Paint;
  fraction: number;
}

export interface PaintMix {
  id: string;
  name?: string;
  type: PaintType;
  paintMixRgb: RgbTuple;
  paintMixRho: number[];
  fractions: PaintFraction[];
  backgroundRgb: RgbTuple | null;
  consistency: PaintConsistency;
  paintMixLayerRgb: RgbTuple;
  dataIndex?: number;
}

export interface SimilarColor {
  paintMix: PaintMix;
  deltaE: number;
}

class UnmixedPaint {
  id: number;
  name: string;
  rgb: Rgb;
  lab: Lab;
  reflectance: Reflectance;
  opacity: PaintOpacity;

  constructor(
    public type: PaintType,
    public brand: PaintBrand,
    {id, name, rgb, rho, opacity}: Paint
  ) {
    this.id = id;
    this.name = name;
    this.rgb = new Rgb(...rgb);
    this.lab = this.rgb.toXyz().toLab();
    this.reflectance = Reflectance.fromArray(rho);
    this.opacity = opacity;
  }

  toPaint(): Paint {
    const {type, brand, id, name, opacity} = this;
    return {
      type,
      brand,
      id,
      name,
      rgb: this.rgb.toRgbTuple(),
      rho: this.reflectance.toArray(),
      opacity,
    };
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

class PaintLayer {
  lab: Lab;

  constructor(
    public rgb: Rgb,
    public paint: MixedPaint,
    public background: Rgb | null,
    public consistency: PaintConsistency
  ) {
    this.lab = this.rgb.toXyz().toLab();
  }

  toPaintMix(): PaintMix {
    const {type, fractions, rgb, reflectance} = this.paint;
    return {
      id: getPaintMixId(type, fractions, this.consistency, this.background),
      type,
      paintMixRgb: rgb.toRgbTuple(),
      paintMixRho: reflectance.toArray(),
      fractions,
      backgroundRgb: this.background?.toRgbTuple() ?? null,
      consistency: this.consistency,
      paintMixLayerRgb: this.rgb.toRgbTuple(),
    };
  }
}

function comparePaintFractionsByFraction(a: PaintFraction, b: PaintFraction): number {
  return b.fraction - a.fraction;
}

function comparePaintFractionsByPaints(a: PaintFraction, b: PaintFraction): number {
  return a.paint.brand - b.paint.brand || a.paint.id - b.paint.id;
}

export function comparePaintMixesByDataIndex(a: PaintMix, b: PaintMix): number {
  return (b.dataIndex ?? 0) - (a.dataIndex ?? 0);
}

export function comparePaintMixesByName(a: PaintMix, b: PaintMix): number {
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
}

export function compareSimilarColorsByDeltaE(a: SimilarColor, b: SimilarColor) {
  return a.deltaE - b.deltaE;
}

export function compareSimilarColorsByPaintMixFractionsLength(a: SimilarColor, b: SimilarColor) {
  return a.paintMix.fractions.length - b.paintMix.fractions.length || a.deltaE - b.deltaE;
}

function getPaintMixId(
  type: PaintType,
  fractions: PaintFraction[],
  consistency: PaintConsistency,
  background: Rgb | null
): string {
  return (
    type +
    ';' +
    fractions
      .map(({paint: {brand, id}, fraction}: PaintFraction) => `${brand}-${id}x${fraction}`)
      .join(',') +
    ';' +
    consistency.join(':') +
    (background ? ';' + background.toHex() : '')
  );
}

function getPaintMixHash({fractions}: PaintMix): string {
  return fractions
    .slice()
    .sort(comparePaintFractionsByPaints)
    .map(({paint: {brand, id}}: PaintFraction) => brand + '_' + id)
    .join('-');
}

function makePaintsConsistencies(
  paints: MixedPaint[],
  background: Rgb,
  backgroundReflectance: Reflectance
): PaintLayer[] {
  return paints.flatMap((paint: MixedPaint): PaintLayer[] =>
    CONSISTENCIES.map((consistency: PaintConsistency): PaintLayer => {
      const [_, fluidFraction] = consistency;
      if (fluidFraction === 0) {
        return new PaintLayer(paint.rgb, paint, null, consistency);
      }
      const reflectance = Reflectance.mixSubtractively(
        [paint.reflectance, backgroundReflectance],
        consistency
      );
      return new PaintLayer(reflectance.toRgb(), paint, background, consistency);
    })
  );
}

function makeOnePaintMixes(type: PaintType, paints: UnmixedPaint[]): MixedPaint[] {
  return paints.flatMap(
    (paint: UnmixedPaint) =>
      new MixedPaint(type, paint.reflectance, [{paint: paint.toPaint(), fraction: 1}])
  );
}

function makeTwoPaintsMixes(type: PaintType, paints: UnmixedPaint[]): MixedPaint[] {
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
        const reflectance = Reflectance.mixSubtractively(
          [paint1.reflectance, paint2.reflectance],
          fractions
        );
        const paintFractions: PaintFraction[] = [
          {paint: paint1.toPaint(), fraction: fractions[0]},
          {paint: paint2.toPaint(), fraction: fractions[1]},
        ];
        paintFractions.sort(comparePaintFractionsByFraction);
        mixedPaints.push(new MixedPaint(type, reflectance, paintFractions));
      });
    }
  }
  return mixedPaints;
}

function makeThreePaintsMixes(type: PaintType, paints: UnmixedPaint[]): MixedPaint[] {
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
          const reflectance = Reflectance.mixSubtractively(
            [paint1.reflectance, paint2.reflectance, paint3.reflectance],
            fractions
          );
          const paintFractions: PaintFraction[] = [
            {paint: paint1.toPaint(), fraction: fractions[0]},
            {paint: paint2.toPaint(), fraction: fractions[1]},
            {paint: paint3.toPaint(), fraction: fractions[2]},
          ];
          paintFractions.sort(comparePaintFractionsByFraction);
          mixedPaints.push(new MixedPaint(type, reflectance, paintFractions));
        });
      }
    }
  }
  return mixedPaints;
}

function uniqueSimilarColors(similarColors: SimilarColor[]): SimilarColor[] {
  return unique(similarColors, ({paintMix}: SimilarColor): string => getPaintMixHash(paintMix));
}

export class ColorMixer {
  private paintType: PaintType | null = null;

  private onePaintMixes: MixedPaint[] = [];
  private twoPaintsMixes: MixedPaint[] = [];
  private threePaintsMixes: MixedPaint[] = [];

  private onePaintMixLayers: PaintLayer[] = [];
  private twoPaintsMixLayers: PaintLayer[] = [];
  private threePaintsMixLayers: PaintLayer[] = [];

  private background: Rgb | null = null;

  private async getUnmixedColors({colors: paints}: PaintSet): Promise<UnmixedPaint[]> {
    return paints.flatMap((paint: Paint) => new UnmixedPaint(paint.type, paint.brand, paint));
  }

  async setPaintSet(paintSet: PaintSet) {
    this.paintType = paintSet.type;
    await this.mixPaints(paintSet);
    if (this.background) {
      await this.makePaintsConsistencies(this.background);
    }
  }

  async setBackground(backgroundColorHex: string) {
    this.background = Rgb.fromHex(backgroundColorHex);
    await this.makePaintsConsistencies(this.background);
  }

  private async mixPaints(paintSet: PaintSet): Promise<void> {
    if (process.env.NODE_ENV !== 'production') {
      console.time('mix-paints');
    }
    const {type} = paintSet;
    const unmixedColors: UnmixedPaint[] = await this.getUnmixedColors(paintSet);
    this.onePaintMixes = makeOnePaintMixes(type, unmixedColors);
    this.twoPaintsMixes = makeTwoPaintsMixes(type, unmixedColors);
    this.threePaintsMixes = makeThreePaintsMixes(type, unmixedColors);
    if (process.env.NODE_ENV !== 'production') {
      console.timeEnd('mix-paints');
    }
  }

  private async makePaintsConsistencies(background: Rgb): Promise<void> {
    if (process.env.NODE_ENV !== 'production') {
      console.time('make-paints-consistencies');
    }
    const backgroundReflectance: Reflectance = background.toReflectance();
    this.onePaintMixLayers = makePaintsConsistencies(
      this.onePaintMixes,
      background,
      backgroundReflectance
    );
    this.twoPaintsMixLayers = makePaintsConsistencies(
      this.twoPaintsMixes,
      background,
      backgroundReflectance
    );
    this.threePaintsMixLayers = makePaintsConsistencies(
      this.threePaintsMixes,
      background,
      backgroundReflectance
    );
    if (process.env.NODE_ENV !== 'production') {
      console.timeEnd('make-paints-consistencies');
    }
  }

  findSimilarColors(
    targetColor: string | RgbTuple,
    isGlaze = false,
    maxDeltaE = 2,
    limitResultsForMixes = 5
  ): SimilarColor[] {
    const rgb = Rgb.fromHexOrTuple(targetColor);
    if (this.background?.equals(rgb)) {
      return [];
    }
    const lab: Lab = rgb.toXyz().toLab();
    const onlyThickConsistency = this.paintType !== PaintType.Watercolor && !isGlaze;
    const allSimilarColors: SimilarColor[] = [];
    let topNSimilarColors: SimilarColor[] = [];
    for (const layers of [
      this.onePaintMixLayers,
      this.twoPaintsMixLayers,
      this.threePaintsMixLayers,
    ]) {
      const similarColors: SimilarColor[] = [];
      for (const layer of layers) {
        const [_, fluidFraction] = layer.consistency;
        if (onlyThickConsistency && fluidFraction !== 0) {
          continue;
        }
        if (isGlaze && (fluidFraction === 0 || layer.paint.isOpaque())) {
          continue;
        }
        const deltaE: number = layer.lab.getDeltaE2000(lab);
        if (deltaE > DELTA_E_LIMIT) {
          continue;
        }
        const similarColor: SimilarColor = {
          paintMix: layer.toPaintMix(),
          deltaE,
        };
        if (similarColors.length === 0) {
          topNSimilarColors.push(similarColor);
          topNSimilarColors.sort(compareSimilarColorsByDeltaE);
          topNSimilarColors = uniqueSimilarColors(topNSimilarColors);
          if (topNSimilarColors.length > limitResultsForMixes) {
            topNSimilarColors.pop();
          }
        }
        if (deltaE <= maxDeltaE) {
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
