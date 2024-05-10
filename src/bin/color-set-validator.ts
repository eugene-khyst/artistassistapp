/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {readdirSync, readFileSync, statSync} from 'fs';
import {EOL} from 'os';
import {join} from 'path';

import type {ColorRecord, StandardColorSet} from '~/src/services/color';

function findDuplicates(array: number[]): number[] {
  return array.filter((element, index) => array.indexOf(element) !== index);
}

function findDifference(array1: number[], array2: number[]): number[] {
  return array1.filter(element => !array2.includes(element));
}

function processFiles(dirPath: string, errors: string[]) {
  console.log('Processing files in ', dirPath);
  const colorSetsPath: string = join(dirPath, 'sets.json');
  const colorSetsContent: string = readFileSync(colorSetsPath, 'utf8');
  const colorSets: StandardColorSet[] = JSON.parse(colorSetsContent) as StandardColorSet[];
  const colorsPath: string = join(dirPath, 'colors.json');
  const colorsContent: string = readFileSync(colorsPath, 'utf-8');
  const colors: ColorRecord[] = JSON.parse(colorsContent) as ColorRecord[];
  for (const [id, name, hex, rho, opacity] of colors) {
    if (!hex) {
      errors.push(`Color ${name} (${id}) in ${colorsPath} is missing RGB`);
    }
    if (!rho?.length) {
      errors.push(`Color ${name} (${id}) in ${colorsPath} is missing reflectance`);
    }
    if (!opacity && opacity > 0) {
      errors.push(`Color ${name} (${id}) in ${colorsPath} is missing opacity`);
    }
  }
  const colorIds: number[] = colors.map(([id]: ColorRecord) => id);
  for (const {name, colors} of colorSets) {
    const duplicates = findDuplicates(colors);
    if (duplicates.length > 0) {
      errors.push(`Set ${name} in ${colorSetsPath} contains duplicates: ${duplicates.join(',')}`);
    }
    const difference = findDifference(colors, colorIds);
    if (difference.length > 0) {
      errors.push(
        `Set ${name} in ${colorSetsPath} contains missing colors: ${difference.join(',')}`
      );
    }
  }
}

function processDir(dirPath: string, errors: string[]) {
  console.log('Processing dir', dirPath);
  const files: string[] = readdirSync(dirPath);

  files.forEach((file: string) => {
    const filePath = `${dirPath}/${file}`;
    if (statSync(filePath).isDirectory()) {
      processDir(filePath, errors);
    } else if (file === 'sets.json') {
      processFiles(dirPath, errors);
    }
  });
}

const errors: string[] = [];
processDir(process.argv[2], errors);
if (errors.length > 0) {
  throw new Error(errors.join(EOL));
}

// npx ts-node --project ./src/bin/tsconfig.json src/bin/color-set-validator.ts
