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

import {applyEditImageCommand} from '@/services/image/edit-image';
import {EditImageCommandType} from '@/services/image/edit-image-command';

const imageOperations = vi.hoisted(() => ({
  adjustColors: vi.fn(),
  straightenImage: vi.fn(),
  removeBackground: vi.fn(),
  createWithBackground: vi.fn(),
  cropRectangle: vi.fn(),
  drawImage: vi.fn(),
  rotate: vi.fn(),
}));

vi.mock('@/services/image/adjust-colors', () => ({
  adjustColors: imageOperations.adjustColors,
}));

vi.mock('@/services/image/remove-background', () => ({
  removeBackground: imageOperations.removeBackground,
}));

vi.mock('@/services/image/straighten', () => ({
  straightenImage: imageOperations.straightenImage,
}));

vi.mock('@/utils/graphics', () => ({
  createImageBitmapWithBackground: imageOperations.createWithBackground,
  DrawImage: {cropRectangle: imageOperations.cropRectangle},
  drawImageToOffscreenCanvas: imageOperations.drawImage,
  rotateImageBitmapClockwise: imageOperations.rotate,
}));

function createImage(width = 100, height = 100): ImageBitmap {
  return {width, height, close: vi.fn()};
}

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('EditImageCommand', () => {
  it('replays background removal from its PNG mask', async () => {
    const image = createImage(100, 80);
    const mask = createImage(20, 16);
    const maskBlob = new Blob();
    const transparentCanvas = {} as OffscreenCanvas;
    const result = createImage(100, 80);
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValueOnce(mask));
    imageOperations.removeBackground.mockReturnValueOnce(transparentCanvas);
    imageOperations.createWithBackground.mockResolvedValueOnce(result);

    const actual = await applyEditImageCommand(
      image,
      {type: EditImageCommandType.RemoveBackground, mask: maskBlob, backgroundColor: '#ffffff'},
      new AbortController().signal
    );

    expect(actual).toBe(result);
    expect(createImageBitmap).toHaveBeenCalledWith(maskBlob);
    expect(imageOperations.removeBackground).toHaveBeenCalledWith(image, mask);
    expect(imageOperations.createWithBackground).toHaveBeenCalledWith(transparentCanvas, '#ffffff');
    expect(mask.close).toHaveBeenCalledOnce();
    expect(image.close).not.toHaveBeenCalled();
  });
});
