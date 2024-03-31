/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Reflectance, Rgb} from '~/src/services/color/model';

const colorFractions: string[] = process.argv.slice(2);
const reflectances: Reflectance[] = [];
const fractions: number[] = [];
for (let i = 0; i < colorFractions.length; i += 2) {
  const fraction: number = Number(colorFractions[i]);
  const colorHex: string = colorFractions[i + 1];
  fractions.push(fraction);
  reflectances.push(Rgb.fromHex(colorHex).toReflectance());
}
console.log(Reflectance.mixSubtractively(reflectances, fractions).toRgb().toHex());

// npx ts-node --project ./src/bin/tsconfig.json src/bin/color-mixer.ts 1 0062A9 1 EB2D79 1 FEEE21
