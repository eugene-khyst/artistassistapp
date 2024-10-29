/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

export function arrayBufferToBlob(buffer: ArrayBuffer, type: string) {
  return new Blob([buffer], {type});
}
