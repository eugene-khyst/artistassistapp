/**
 * ArtistAssistApp
 * Copyright (C) 2023-2026  Eugene Khyst
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import {afterEach, describe, expect, it, vi} from 'vitest';

import {Interpolation} from '@/services/image/filter/types';
import {
  inpaintImage,
  INPAINTING_UPSCALE_MIN_SCALE_FACTOR,
  shouldUpscaleInpaintedImage,
} from '@/services/image/inpaint';
import type {OnnxModel} from '@/services/ml/types';

const interpolationMocks = vi.hoisted(() => ({interpolationWebGL: vi.fn()}));
const transformerMocks = vi.hoisted(() => ({transformImage: vi.fn()}));

vi.mock('@/services/image/filter/interpolation-webgl', () => interpolationMocks);
vi.mock('@/services/ml/image-transformer', () => transformerMocks);

afterEach(() => {
  vi.clearAllMocks();
});

describe('inpainting upscale', () => {
  it('upscales only when either target axis reaches the minimum scale factor', () => {
    const source = {width: 512, height: 512};

    expect(INPAINTING_UPSCALE_MIN_SCALE_FACTOR).toBe(1.5);
    expect(shouldUpscaleInpaintedImage(source, {width: 767, height: 512})).toBe(false);
    expect(shouldUpscaleInpaintedImage(source, {width: 768, height: 512})).toBe(true);
    expect(shouldUpscaleInpaintedImage(source, {width: 512, height: 768})).toBe(true);
  });

  it('fits the inpainted window without upscaling below the minimum scale factor', async () => {
    const image = {width: 512, height: 512} as OffscreenCanvas;
    const mask = {width: 512, height: 512} as OffscreenCanvas;
    const inpaintedImage = {width: 512, height: 512} as OffscreenCanvas;
    const fittedImage = {width: 600, height: 600} as OffscreenCanvas;
    transformerMocks.transformImage.mockResolvedValue(inpaintedImage);
    interpolationMocks.interpolationWebGL.mockReturnValue(fittedImage);

    await expect(
      inpaintImage({
        images: [image, mask],
        target: {width: 600, height: 600},
        inpaintModel: {id: 'inpaint'} as OnnxModel,
        upscaleModel: {id: 'upscale'} as OnnxModel,
        auth: null,
        progressCallback: vi.fn(),
        signal: new AbortController().signal,
      })
    ).resolves.toBe(fittedImage);

    // 600 of 512 is below the 1.5 minimum, so the upscale model never runs.
    expect(transformerMocks.transformImage).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({images: [image, mask], model: {id: 'inpaint'}})
    );
    expect(interpolationMocks.interpolationWebGL).toHaveBeenCalledExactlyOnceWith(
      inpaintedImage,
      600,
      600,
      Interpolation.Lanczos
    );
  });
});
