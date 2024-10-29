/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SampleImageDefinition {
  image: string;
  thumbnail: string;
  name: string;
}

export const SAMPLE_IMAGES: SampleImageDefinition[] = ['Chrysanthemum', 'Sunset'].map(
  (name: string): SampleImageDefinition => ({
    image: `/sample-images/${name.toLowerCase()}.webp`,
    thumbnail: `/sample-images/${name.toLowerCase()}-thumbnail.webp`,
    name,
  })
);
