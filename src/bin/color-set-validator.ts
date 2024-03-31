/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {readFileSync, readdirSync, statSync} from 'fs';
import {StoreBoughtPaintSet} from '~/src/services/color';

function findDuplicates(arr: number[]): number[] {
  return arr.filter((item, index) => arr.indexOf(item) !== index);
}

function processFile(filePath: string) {
  console.log('Processing file', filePath);
  const data: string = readFileSync(filePath, 'utf8');
  const paintSets: StoreBoughtPaintSet[] = JSON.parse(data);
  for (const {name, colors} of paintSets) {
    const duplicates = findDuplicates(colors);
    if (duplicates.length > 0) {
      throw new Error(`${name} in ${filePath} contains duplicates: ${duplicates.join(',')}`);
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
      processFile(filePath);
    }
  });
}

processDir(process.argv[2]);

// npx ts-node --project ./src/bin/tsconfig.json src/bin/color-set-validator.ts
