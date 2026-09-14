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

import {highPassWebGL} from '@/services/image/filter/high-pass-webgl';
import type {KernelSize} from '@/services/image/filter/types';
import {unsharpMaskWebGL} from '@/services/image/filter/unsharp-mask-webgl';
import {SharpenMode} from '@/services/image/sharpen-controls';
import {type DrawImageSource, toOffscreenCanvas} from '@/utils/graphics';

type SharpenStrategy = (image: DrawImageSource, strength?: number) => OffscreenCanvas;

const SHARPEN_STRATEGIES = {
  [SharpenMode.UnsharpMask]: unsharpMask,
  [SharpenMode.HighPass]: highPass,
} satisfies Record<SharpenMode, SharpenStrategy>;

export function sharpen(image: DrawImageSource, mode: SharpenMode, strength = 1): OffscreenCanvas {
  return SHARPEN_STRATEGIES[mode](image, strength);
}

const UNSHARP_MASK_KERNEL_SIZE: KernelSize = 21;
const UNSHARP_MASK_STANDARD_DEVIATION = 3;
const UNSHARP_MASK_AMOUNT = 0.5;
const UNSHARP_MASK_THRESHOLD = 0;

export function unsharpMask(image: DrawImageSource, strength = 1): OffscreenCanvas {
  return unsharpMaskWebGL(
    toOffscreenCanvas(image),
    UNSHARP_MASK_KERNEL_SIZE,
    UNSHARP_MASK_STANDARD_DEVIATION,
    UNSHARP_MASK_AMOUNT * strength,
    UNSHARP_MASK_THRESHOLD
  );
}

const HIGH_PASS_KERNEL_SIZE: KernelSize = 25;
const HIGH_PASS_STANDARD_DEVIATION = 4;

export function highPass(image: DrawImageSource, strength = 1): OffscreenCanvas {
  return highPassWebGL(
    toOffscreenCanvas(image),
    HIGH_PASS_KERNEL_SIZE,
    HIGH_PASS_STANDARD_DEVIATION,
    strength
  );
}
