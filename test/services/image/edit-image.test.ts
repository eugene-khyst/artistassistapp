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
import {type EditImageCommand, EditImageCommandType} from '@/services/image/edit-image-command';
import type {ImageExpansion} from '@/services/image/expand-image';
import {
  DEFAULT_EXPAND_IMAGE_CONTROLS,
  ExpandImageFillMode,
  ExpandImageSizeMode,
} from '@/services/image/expand-image-controls';

const expansionMocks = vi.hoisted(() => ({drawExpandedImage: vi.fn()}));

vi.mock('@/services/image/adjust-colors', () => ({adjustColors: vi.fn()}));
vi.mock('@/services/image/expand-image', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...expansionMocks,
}));
vi.mock('@/services/image/remove-background', () => ({removeBackground: vi.fn()}));
vi.mock('@/services/image/straighten', () => ({straightenImage: vi.fn()}));

interface ExpandedCanvasCall {
  context: {drawImage: ReturnType<typeof vi.fn>};
  result: ImageBitmap;
}

function mockExpandedCanvases(): ExpandedCanvasCall[] {
  const calls: ExpandedCanvasCall[] = [];
  expansionMocks.drawExpandedImage.mockImplementation(
    (_image: ImageBitmap, expansion: ImageExpansion) => {
      const context = {drawImage: vi.fn()};
      const result = {
        width: expansion.bounds.width,
        height: expansion.bounds.height,
        close: vi.fn(),
      } as unknown as ImageBitmap;
      const canvas = {transferToImageBitmap: vi.fn(() => result)};
      calls.push({context, result});
      return [canvas, context];
    }
  );
  return calls;
}

function image(width: number, height: number): ImageBitmap {
  return {width, height, close: vi.fn()};
}

function mockPatchCanvases(): number[][] {
  const fadeLines: number[][] = [];
  vi.stubGlobal(
    'OffscreenCanvas',
    class {
      constructor(
        readonly width: number,
        readonly height: number
      ) {}
      getContext() {
        return {
          drawImage: vi.fn(),
          createLinearGradient: vi.fn((...line: number[]) => {
            fadeLines.push(line);
            return {addColorStop: vi.fn()};
          }),
          fillRect: vi.fn(),
        };
      }
    }
  );
  return fadeLines;
}

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('applyEditImageCommand Expand', () => {
  it('replays horizontal Smart margin patches at the same positions and dimensions', async () => {
    const calls = mockExpandedCanvases();
    mockPatchCanvases();
    const source = image(100, 100);
    const marginPatches = [new Blob(['left']), new Blob(['right'])];
    const decodedPatches = [image(77, 100), image(78, 100), image(77, 100), image(78, 100)];
    const remainingPatches = [...decodedPatches];
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockImplementation(async () => remainingPatches.shift())
    );
    const command: EditImageCommand = {
      type: EditImageCommandType.Expand,
      controls: {
        ...DEFAULT_EXPAND_IMAGE_CONTROLS,
        aspectRatio: [1.91, 1],
        fillMode: ExpandImageFillMode.Smart,
      },
      marginPatches,
    };

    const applied = await applyEditImageCommand(source, command, new AbortController().signal);
    const replayed = await applyEditImageCommand(source, command, new AbortController().signal);

    expect([applied.width, applied.height]).toEqual([191, 100]);
    expect([replayed.width, replayed.height]).toEqual([191, 100]);
    for (const {context} of calls) {
      expect(context.drawImage).toHaveBeenNthCalledWith(1, expect.anything(), 0, 0);
      expect(context.drawImage).toHaveBeenNthCalledWith(2, expect.anything(), 113, 0);
    }
    decodedPatches.forEach(patch => {
      expect(patch.close).toHaveBeenCalledOnce();
    });
  });

  it('replays all four padded margin patches in expansion order', async () => {
    const calls = mockExpandedCanvases();
    const fadeLines = mockPatchCanvases();
    const source = image(200, 100);
    const decodedPatches = [image(240, 52), image(240, 52), image(52, 140), image(52, 140)];
    const remainingPatches = [...decodedPatches];
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockImplementation(async () => remainingPatches.shift())
    );
    const command: EditImageCommand = {
      type: EditImageCommandType.Expand,
      controls: {
        ...DEFAULT_EXPAND_IMAGE_CONTROLS,
        sizeMode: ExpandImageSizeMode.Margins,
        marginX: 10,
        marginY: 20,
        fillMode: ExpandImageFillMode.Smart,
      },
      marginPatches: [
        new Blob(['top']),
        new Blob(['bottom']),
        new Blob(['left']),
        new Blob(['right']),
      ],
    };

    const result = await applyEditImageCommand(source, command, new AbortController().signal);

    expect([result.width, result.height]).toEqual([240, 140]);
    expect(calls[0]!.context.drawImage.mock.calls.map(([, x, y]) => [x, y])).toEqual([
      [0, 0],
      [0, 88],
      [0, 0],
      [188, 0],
    ]);
    expect(fadeLines).toEqual([
      [20, 20, 20, 52],
      [220, 32, 220, 0],
      [20, 20, 52, 20],
      [32, 120, 0, 120],
    ]);
    decodedPatches.forEach(patch => {
      expect(patch.close).toHaveBeenCalledOnce();
    });
  });
});
