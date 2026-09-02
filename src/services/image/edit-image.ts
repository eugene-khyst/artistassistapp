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
import {drawExpandedImage, getImageExpansion} from '@/services/image/expand-image';
import {ExpandImageFillMode} from '@/services/image/expand-image-controls';
import {inpaintingPatchRectangle} from '@/services/image/inpainting-patch';
import {removeBackground} from '@/services/image/remove-background';
import {straightenImage} from '@/services/image/straighten';
import {Rectangle, Vector} from '@/services/math/geometry';
import {
  DrawImage,
  drawImageToOffscreenCanvas,
  fadeImage,
  fillOffscreenCanvasBackground,
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
    case EditImageCommandType.Expand:
      result = await applyExpandImageCommand(image, command, signal);
      break;
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
    case EditImageCommandType.RemoveObjects:
      result = await applyRemoveObjectsCommand(image, command, signal);
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

async function applyExpandImageCommand(
  image: ImageBitmap,
  command: Extract<EditImageCommand, {type: EditImageCommandType.Expand}>,
  signal: AbortSignal
): Promise<ImageBitmap> {
  const expansion = getImageExpansion(image, command.controls);
  const [canvas, ctx] = drawExpandedImage(
    image,
    expansion,
    command.controls.fillMode === ExpandImageFillMode.Color ? command.controls.color : '#fff'
  );
  for (const [index, blob] of (command.marginPatches ?? []).entries()) {
    const margin = expansion.margins[index]!;
    const patchRectangle = inpaintingPatchRectangle(margin, expansion.bounds);
    const {topLeft} = patchRectangle;
    const patch = await createImageBitmap(blob);
    try {
      signal.throwIfAborted();
      ctx.drawImage(
        fadeMarginPatch(patch, patchRectangle, margin, expansion.sourceRectangle),
        topLeft.x,
        topLeft.y
      );
    } finally {
      patch.close();
    }
  }
  return canvas.transferToImageBitmap();
}

// The patch is generated at model resolution, so a hard edge over real pixels shows as a seam.
function fadeMarginPatch(
  patch: ImageBitmap,
  patchRectangle: Rectangle,
  margin: Rectangle,
  sourceRectangle: Rectangle
): OffscreenCanvas {
  const {marginSide, imageSide} = fadeEnds(patchRectangle.intersect(sourceRectangle)!, margin);
  const {topLeft} = patchRectangle;
  return fadeImage(patch, marginSide.subtract(topLeft), imageSide.subtract(topLeft));
}

function fadeEnds(overlap: Rectangle, margin: Rectangle): {marginSide: Vector; imageSide: Vector} {
  const {topLeft, bottomRight, center} = overlap;
  const towardsImage = center.subtract(margin.center);
  if (Math.abs(towardsImage.x) > Math.abs(towardsImage.y)) {
    return towardsImage.x > 0
      ? {marginSide: topLeft, imageSide: new Vector(bottomRight.x, topLeft.y)}
      : {marginSide: bottomRight, imageSide: new Vector(topLeft.x, bottomRight.y)};
  }
  return towardsImage.y > 0
    ? {marginSide: topLeft, imageSide: new Vector(topLeft.x, bottomRight.y)}
    : {marginSide: bottomRight, imageSide: new Vector(bottomRight.x, topLeft.y)};
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
    const canvas = removeBackground(image, mask);
    if (backgroundColor) {
      fillOffscreenCanvasBackground(canvas, backgroundColor);
    }
    return canvas.transferToImageBitmap();
  } finally {
    mask.close();
  }
}

async function applyRemoveObjectsCommand(
  image: ImageBitmap,
  {patchRectangle, result}: Extract<EditImageCommand, {type: EditImageCommandType.RemoveObjects}>,
  signal: AbortSignal
): Promise<ImageBitmap> {
  const patch = await createImageBitmap(result);
  try {
    signal.throwIfAborted();
    const [canvas, ctx] = drawImageToOffscreenCanvas(image);
    ctx.drawImage(patch, patchRectangle.x, patchRectangle.y);
    return canvas.transferToImageBitmap();
  } finally {
    patch.close();
  }
}
