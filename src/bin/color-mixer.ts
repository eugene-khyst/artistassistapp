/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Reflectance, Rgb} from '~/src/services/color/space';

const parts: string[] = process.argv.slice(2);
const reflectances: Reflectance[] = [];
const ratio: number[] = [];
for (let i = 0; i < parts.length; i += 2) {
  const part: number = Number(parts[i]);
  const colorHex: string = parts[i + 1];
  ratio.push(part);
  reflectances.push(Rgb.fromHex(colorHex).toReflectance());
}
console.log(Reflectance.mixSubtractively(reflectances, ratio).toRgb().toHex());

// npx ts-node --project ./src/bin/tsconfig.json src/bin/color-mixer.ts 1 0062A9 1 EB2D79 1 FEEE21
