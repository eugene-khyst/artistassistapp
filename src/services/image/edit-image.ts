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

import {adjustColors} from '@/services/image/adjust-colors';
import {adjustmentParameters, whiteBalanceMaxValues} from '@/services/image/adjust-colors-controls';
import {type EditImageCommand, EditImageCommandType} from '@/services/image/edit-image-command';
import {removeBackground} from '@/services/image/remove-background';
import {straightenImage} from '@/services/image/straighten';
import {Rectangle, Vector} from '@/services/math/geometry';
import {
  createImageBitmapWithBackground,
  DrawImage,
  drawImageToOffscreenCanvas,
  rotateImageBitmapClockwise,
} from '@/utils/graphics';

export async function applyEditImageCommand(
  image: ImageBitmap,
  command: EditImageCommand,
  signal: AbortSignal
): Promise<ImageBitmap> {
  signal.throwIfAborted();
  let result: ImageBitmap;
  switch (command.type) {
    case EditImageCommandType.RotateClockwise:
      result = rotateImageBitmapClockwise(image);
      break;
    case EditImageCommandType.Straighten:
      result = straightenImage(
        image,
        command.vertices.map(({x, y}) => new Vector(x, y))
      );
      break;
    case EditImageCommandType.Crop: {
      const {x, y, width, height} = command.rectangle;
      const rectangle = new Rectangle(new Vector(x + width, y + height), new Vector(x, y));
      const [canvas] = drawImageToOffscreenCanvas(image, {
        drawImage: DrawImage.cropRectangle(rectangle),
        fillStyle: 'transparent',
      });
      result = canvas.transferToImageBitmap();
      break;
    }
    case EditImageCommandType.AdjustColors:
      result = adjustColors(
        image,
        adjustmentParameters(command.controls),
        whiteBalanceMaxValues(command.controls, command.maxValues)
      );
      break;
    case EditImageCommandType.RemoveBackground:
      result = await applyRemoveBackgroundCommand(image, command, signal);
      break;
  }
  try {
    signal.throwIfAborted();
    return result;
  } catch (error) {
    result.close();
    throw error;
  }
}

async function applyRemoveBackgroundCommand(
  image: ImageBitmap,
  {
    mask: maskBlob,
    backgroundColor,
  }: Extract<EditImageCommand, {type: EditImageCommandType.RemoveBackground}>,
  signal: AbortSignal
): Promise<ImageBitmap> {
  const mask = await createImageBitmap(maskBlob);
  try {
    signal.throwIfAborted();
    return await createImageBitmapWithBackground(removeBackground(image, mask), backgroundColor);
  } finally {
    mask.close();
  }
}
