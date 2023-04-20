/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

export function countFractionDigits(number: number): number {
  const numberStr = String(number);
  if (numberStr.includes('.')) {
    return numberStr.split('.')[1].length;
  }
  return 0;
}
