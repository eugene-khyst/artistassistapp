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

import type {AdjustColorsControls} from '@/services/image/adjust-colors-controls';
import type {ExpandImageControls} from '@/services/image/expand-image-controls';
import {Vector} from '@/services/math/geometry';

interface EditImagePoint {
  x: number;
  y: number;
}

interface EditImageRectangle extends EditImagePoint {
  width: number;
  height: number;
}

export enum EditImageCommandType {
  RotateClockwise = 'rotate-clockwise',
  Straighten = 'straighten',
  Crop = 'crop',
  Expand = 'expand',
  AdjustColors = 'adjust-colors',
  RemoveBackground = 'remove-background',
  RemoveObjects = 'remove-objects',
  Upscale = 'upscale',
}

export type EditImageCommand =
  | {type: EditImageCommandType.RotateClockwise}
  | {type: EditImageCommandType.Straighten; vertices: EditImagePoint[]}
  | {type: EditImageCommandType.Crop; rectangle: EditImageRectangle}
  | {
      type: EditImageCommandType.Expand;
      controls: ExpandImageControls;
      marginPatches?: Blob[];
    }
  | {
      type: EditImageCommandType.AdjustColors;
      controls: AdjustColorsControls;
      maxValues?: number[];
    }
  | {
      type: EditImageCommandType.RemoveBackground;
      mask: Blob;
      backgroundColor: string | null;
    }
  | {
      type: EditImageCommandType.RemoveObjects;
      vertices: EditImagePoint[];
      patchRectangle: EditImageRectangle;
      result: Blob;
    }
  | {
      type: EditImageCommandType.Upscale;
      result: Blob;
    };

export function commandVertices(
  command: EditImageCommand | undefined,
  type: EditImageCommandType
): Vector[] | undefined {
  return command?.type === type && 'vertices' in command
    ? command.vertices.map(({x, y}) => new Vector(x, y))
    : undefined;
}
