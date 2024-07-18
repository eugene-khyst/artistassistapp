/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ImageFile {
  id?: number;
  buffer: ArrayBuffer;
  type: string;
  name?: string;
  date?: Date;
}

export async function fileToImageFile(file: File): Promise<ImageFile> {
  const {type, name} = file;
  return {
    buffer: await file.arrayBuffer(),
    type,
    name,
    date: new Date(),
  };
}

export async function blobToImageFile(blob: Blob, name?: string): Promise<ImageFile> {
  return {
    buffer: await blob.arrayBuffer(),
    type: blob.type,
    name,
  };
}
