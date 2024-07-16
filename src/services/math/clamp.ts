/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

export function clamp(number: number, min: number, max: number): number {
  return Math.min(Math.max(min, number), max);
}
