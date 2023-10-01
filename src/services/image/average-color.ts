/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Lab, Rgb} from '../color/model';
import {getRgbaForCoord} from '../../utils';

export function getAverageColor({data, width, height}: ImageData): Rgb {
  if (data.length <= 4) {
    return new Rgb(data[0], data[1], data[2]);
  } else {
    const diameter = Math.trunc(Math.min(width, height));
    const radius = Math.trunc(diameter / 2);
    const radiusPow2 = radius * radius;
    let lSum = 0;
    let aSum = 0;
    let bSum = 0;
    let num = 0;
    for (let y = 0; y < diameter; y++) {
      for (let x = 0; x < diameter; x++) {
        if (Math.pow(x - radius, 2) + Math.pow(y - radius, 2) <= radiusPow2) {
          const [red, green, blue] = getRgbaForCoord(data, x, y, width);
          const rgb = new Rgb(red, green, blue);
          const {l, a, b} = rgb.toXyz().toLab();
          lSum += l;
          aSum += a;
          bSum += b;
          num++;
        }
      }
    }
    return new Lab(lSum / num, aSum / num, bSum / num).toXyz().toRgb();
  }
}
