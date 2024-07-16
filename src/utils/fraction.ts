/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

export type Fraction = [part: number, whole: number];

export function toRatio([part, whole]: Fraction): [number, number] {
  return [part, whole - part];
}
