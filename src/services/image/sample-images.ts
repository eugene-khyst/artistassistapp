/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

export type SampleImageUrl = [imageUrl: URL, thumbnailUrl: URL, name: string];

export const SAMPLE_IMAGES: SampleImageUrl[] = [
  [
    new URL('../../assets/images/samples/Chrysanthemum.jpg', import.meta.url),
    new URL('../../assets/images/samples/Chrysanthemum-thumbnail.jpg', import.meta.url),
    'Chrysanthemum',
  ],
  [
    new URL('../../assets/images/samples/Apples.jpg', import.meta.url),
    new URL('../../assets/images/samples/Apples-thumbnail.jpg', import.meta.url),
    'Apples',
  ],
  [
    new URL('../../assets/images/samples/Sunset.jpg', import.meta.url),
    new URL('../../assets/images/samples/Sunset-thumbnail.jpg', import.meta.url),
    'Sunset',
  ],
];
