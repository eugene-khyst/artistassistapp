/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {readFileSync, readdirSync, statSync} from 'fs';
import {join} from 'path';
import {PaintRecord, StoreBoughtPaintSet} from '~/src/services/color';

function findDuplicates(array: number[]): number[] {
  return array.filter((element, index) => array.indexOf(element) !== index);
}

function findDifference(array1: number[], array2: number[]): number[] {
  return array1.filter(element => !array2.includes(element));
}

function processFiles(dirPath: string) {
  console.log('Processing files in ', dirPath);
  const setsPath: string = join(dirPath, 'sets.json');
  const setsStr: string = readFileSync(setsPath, 'utf8');
  const colorSets: StoreBoughtPaintSet[] = JSON.parse(setsStr);
  const colorPath: string = join(dirPath, 'colors.json');
  const colorsStr: string = readFileSync(colorPath, 'utf-8');
  const colorDefs: PaintRecord[] = JSON.parse(colorsStr);
  for (const [id, name, hex, rho] of colorDefs) {
    if (!hex || !rho?.length) {
      throw new Error(`Color ${name} (${id}) in ${colorPath} is missing RGB or reflectance`);
    }
  }
  const colorIds: number[] = colorDefs.map(([id]: PaintRecord) => id);
  for (const {name, colors} of colorSets) {
    const duplicates = findDuplicates(colors);
    if (duplicates.length > 0) {
      throw new Error(`Set ${name} in ${setsPath} contains duplicates: ${duplicates.join(',')}`);
    }
    const difference = findDifference(colors, colorIds);
    if (difference.length > 0) {
      throw new Error(
        `Set ${name} in ${setsPath} contains missing colors: ${difference.join(',')}`
      );
    }
  }
}

function processDir(dirPath: string) {
  console.log('Processing dir', dirPath);
  const files: string[] = readdirSync(dirPath);

  files.forEach((file: string) => {
    const filePath = `${dirPath}/${file}`;
    if (statSync(filePath).isDirectory()) {
      processDir(filePath);
    } else if (file === 'sets.json') {
      processFiles(dirPath);
    }
  });
}

processDir(process.argv[2]);

// npx ts-node --project ./src/bin/tsconfig.json src/bin/color-set-validator.ts
