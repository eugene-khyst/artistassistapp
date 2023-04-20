/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

function gcdTwo(a: number, b: number) {
  let r: number;
  while (b !== 0) {
    r = a % b;
    a = b;
    b = r;
  }
  return a < 0 ? -a : a;
}

export function gcd(a: number, b: number, ...rest: number[]) {
  let res = gcdTwo(a, b);
  for (let i = 0; i < rest.length; i++) {
    res = gcdTwo(res, rest[i]);
  }
  return res;
}
