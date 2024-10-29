/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

export function invert({data}: ImageData): void {
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.abs(data[i] - 255);
    data[i + 1] = Math.abs(data[i + 1] - 255);
    data[i + 2] = Math.abs(data[i + 2] - 255);
  }
}
