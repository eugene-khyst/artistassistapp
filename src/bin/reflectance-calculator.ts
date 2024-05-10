/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {readdirSync, readFileSync, statSync, writeFileSync} from 'fs';

import type {ColorRecord} from '~/src/services/color';
import {ColorOpacity} from '~/src/services/color';
import {Rgb} from '~/src/services/color/space';

interface ColorDefinition {
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
  const colors = JSON.parse(data) as ColorDefinition[];
  data = JSON.stringify(
    colors.map(
      ({id, name, hex, opacity}: ColorDefinition): ColorRecord => [
        id,
        name,
        hex,
        Rgb.fromHex(hex).toReflectance().toArray(),
        opacity ??
          (srcFilePath.includes('pencils') ? ColorOpacity.SemiTransparent : ColorOpacity.Opaque),
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
  console.log('Processing dir', dirPath);
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

// npx ts-node --project ./src/bin/tsconfig.json src/bin/reflectance-calculator.ts static/data
