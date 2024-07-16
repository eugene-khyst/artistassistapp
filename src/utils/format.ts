/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import type {Fraction} from '~/src/utils';

export function countFractionDigits(number: number): number {
  const numberStr = String(number);
  if (numberStr.includes('.')) {
    return numberStr.split('.')[1].length;
  }
  return 0;
}

export function formatFraction([part, whole]: Fraction): string {
  return `${part}/${whole}`;
}

export function formatRatio([part, whole]: Fraction, inverse = false): string {
  return inverse ? `${whole - part}:${part}` : `${part}:${whole - part}`;
}
