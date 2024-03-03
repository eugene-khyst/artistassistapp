/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {readFileSync, readdirSync, statSync, writeFileSync} from 'fs';
import {PaintOpacity, PaintRecord} from '../services/color';
import {Rgb} from '../services/color/model';

interface PaintSource {
  id: number;
  name: string;
  hex: string;
  opacity: number;
}

const SOURCE_SUFFIX = '-src.json';
const TARGET_SUFFIX = '.json';

function processFile(srcFilePath: string) {
  console.log('Processing source file', srcFilePath);
  let data: string = readFileSync(srcFilePath, 'utf8');
  const paints = JSON.parse(data);
  data = JSON.stringify(
    paints.map(
      ({id, name, hex, opacity}: PaintSource): PaintRecord => [
        id,
        name,
        hex,
        Rgb.fromHex(hex).toReflectance().toArray(),
        opacity ?? PaintOpacity.SemiTransparent,
      ]
    ),
    null,
    2
  );
  const filePath: string = srcFilePath.replace(SOURCE_SUFFIX, TARGET_SUFFIX);
  writeFileSync(filePath, data);
  console.log('Saved file', filePath);
}

function processDir(dirPath: string) {
  const files: string[] = readdirSync(dirPath);

  files.forEach((file: string) => {
    const filePath = `${dirPath}/${file}`;
    if (statSync(filePath).isDirectory()) {
      processDir(filePath);
    } else if (file.endsWith(SOURCE_SUFFIX)) {
      processFile(filePath);
    }
  });
}

processDir(process.argv[2]);

// npx ts-node src/bin/reflectance-calculator.ts static/data
