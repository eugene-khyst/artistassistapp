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

import {correctPerspectiveWebGL} from '~/src/services/image/filter/perspective-correction-webgl';
import {sobelGradientsXyWebGL} from '~/src/services/image/filter/sobel-gradients-xy-webgl';
import {compareByX, compareByY, Vector} from '~/src/services/math/geometry';
import {Matrix} from '~/src/services/math/matrix';
import {imageBitmapToOffscreenCanvas, resizeToLongestSize} from '~/src/utils/graphics';
import type {Size} from '~/src/utils/types';

const AUTO_DETECT_MAX_SIDE = 512;
const AUTO_DETECT_MIN_AREA_RATIO = 0.12;
const AUTO_DETECT_OUTLIER_DISTANCE_PX = 6;
const AUTO_DETECT_SAMPLE_PERCENTILE = 0.45;
const AUTO_DETECT_SAMPLE_STEP_DIVISOR = 256;
const AUTO_DETECT_IMAGE_MARGIN_RATIO = 0.05;
const AUTO_DETECT_MAX_CORNER_OVERSHOOT_RATIO = 0.1;
const LINE_FIT_ITERATIONS = 3;

type Boundary = 'top' | 'right' | 'bottom' | 'left';

interface WeightedPoint {
  point: Vector;
  weight: number;
}

interface Line {
  a: number;
  b: number;
  c: number;
}

export function getPerspectiveCorrectionImage(image: ImageBitmap, vertices: Vector[]): ImageBitmap {
  console.time('perspective-correction');
  const perspectiveCorrectedImage: ImageBitmap = correctPerspectiveWebGL(image, vertices);
  console.timeEnd('perspective-correction');
  return perspectiveCorrectedImage;
}

export function sortVertices(vertices: Vector[]): Vector[] {
  const sortedByY = [...vertices].sort(compareByY);
  const [topLeft, topRight] = sortedByY.slice(0, 2).sort(compareByX);
  const [bottomLeft, bottomRight] = sortedByY.slice(2, 4).sort(compareByX);
  return [topLeft, topRight, bottomRight, bottomLeft].filter((value): value is Vector => !!value);
}

export function calculateDestSize(vertices: Vector[]): Size {
  if (vertices.length !== 4) {
    throw new Error('Incorrect number of vertices');
  }
  const [topLeft, topRight, bottomRight, bottomLeft] = vertices;
  const topWidth = topLeft!.subtract(topRight!).length();
  const bottomWidth = bottomLeft!.subtract(bottomRight!).length();
  const leftHeight = topLeft!.subtract(bottomLeft!).length();
  const rightHeight = topRight!.subtract(bottomRight!).length();
  const width = Math.round((topWidth + bottomWidth) / 2);
  const height = Math.round((leftHeight + rightHeight) / 2);
  if (width <= 0 || height <= 0) {
    throw new Error('Invalid vertices');
  }
  return [width, height];
}

export function computeHomography(src: Vector[], dest: Vector[]): Matrix | null {
  const A = Matrix.zeros(8, 8);
  const b = Matrix.zeros(8, 1);
  for (let i = 0; i < 4; i++) {
    const {x: srcX, y: srcY} = src[i]!;
    const {x: destX, y: destY} = dest[i]!;
    A.set(2 * i, 0, srcX);
    A.set(2 * i, 1, srcY);
    A.set(2 * i, 2, 1);
    A.set(2 * i, 6, -srcX * destX);
    A.set(2 * i, 7, -srcY * destX);
    b.set(2 * i, 0, destX);
    A.set(2 * i + 1, 3, srcX);
    A.set(2 * i + 1, 4, srcY);
    A.set(2 * i + 1, 5, 1);
    A.set(2 * i + 1, 6, -srcX * destY);
    A.set(2 * i + 1, 7, -srcY * destY);
    b.set(2 * i + 1, 0, destY);
  }
  try {
    const h = A.inverse().multiply(b);
    return Matrix.fromRows([
      [h.get(0, 0), h.get(1, 0), h.get(2, 0)],
      [h.get(3, 0), h.get(4, 0), h.get(5, 0)],
      [h.get(6, 0), h.get(7, 0), 1],
    ]);
  } catch (e) {
    console.error(e);
    return null;
  }
}

export function autoDetectPerspectiveVertices(image: ImageBitmap): Vector[] | null {
  const [canvas] = imageBitmapToOffscreenCanvas(
    image,
    false,
    resizeToLongestSize(AUTO_DETECT_MAX_SIDE)
  );
  const {width, height} = canvas;
  if (width < 32 || height < 32) {
    return null;
  }

  const {gradientX, gradientY} = sobelGradientsXyWebGL(canvas);

  const linesByBoundary = new Map<Boundary, Line | null>([
    ['top', fitBoundaryLine(collectBoundarySamples(gradientX, gradientY, width, height, 'top'))],
    [
      'right',
      fitBoundaryLine(collectBoundarySamples(gradientX, gradientY, width, height, 'right')),
    ],
    [
      'bottom',
      fitBoundaryLine(collectBoundarySamples(gradientX, gradientY, width, height, 'bottom')),
    ],
    ['left', fitBoundaryLine(collectBoundarySamples(gradientX, gradientY, width, height, 'left'))],
  ]);

  const topLine = linesByBoundary.get('top');
  const rightLine = linesByBoundary.get('right');
  const bottomLine = linesByBoundary.get('bottom');
  const leftLine = linesByBoundary.get('left');
  if (!topLine || !rightLine || !bottomLine || !leftLine) {
    return null;
  }

  const detectedVertices = [
    intersectLines(topLine, leftLine),
    intersectLines(topLine, rightLine),
    intersectLines(bottomLine, rightLine),
    intersectLines(bottomLine, leftLine),
  ];
  const nonNullDetectedVertices = detectedVertices.filter((vertex): vertex is Vector => !!vertex);
  if (nonNullDetectedVertices.length !== 4) {
    return null;
  }

  const sortedVertices = sortVertices(nonNullDetectedVertices);
  if (!isValidDetectedQuadrilateral(sortedVertices, width, height)) {
    return null;
  }

  const scaleX = image.width / width;
  const scaleY = image.height / height;
  return sortedVertices.map(({x, y}) => {
    return new Vector(x * scaleX, y * scaleY);
  });
}

function collectBoundarySamples(
  gradientX: Uint8Array,
  gradientY: Uint8Array,
  width: number,
  height: number,
  boundary: Boundary
): WeightedPoint[] {
  const marginX = Math.max(3, Math.round(width * AUTO_DETECT_IMAGE_MARGIN_RATIO));
  const marginY = Math.max(3, Math.round(height * AUTO_DETECT_IMAGE_MARGIN_RATIO));
  const horizontal = boundary === 'top' || boundary === 'bottom';
  const scanStep = Math.max(
    1,
    Math.round(Math.max(width, height) / AUTO_DETECT_SAMPLE_STEP_DIVISOR)
  );

  const fixedStart = horizontal ? marginX : marginY;
  const fixedEnd = horizontal ? width - marginX : height - marginY;

  const variableStart = horizontal
    ? boundary === 'top'
      ? marginY
      : Math.max(marginY, Math.round(height * 0.2))
    : boundary === 'left'
      ? marginX
      : Math.max(marginX, Math.round(width * 0.2));
  const variableEnd = horizontal
    ? boundary === 'top'
      ? Math.min(height - marginY, Math.round(height * 0.8))
      : height - marginY
    : boundary === 'left'
      ? Math.min(width - marginX, Math.round(width * 0.8))
      : width - marginX;

  if (fixedStart >= fixedEnd || variableStart >= variableEnd) {
    return [];
  }

  const samples: WeightedPoint[] = [];
  for (let fixed = fixedStart; fixed < fixedEnd; fixed += scanStep) {
    let bestPosition = -1;
    let bestScore = 0;

    for (let variable = variableStart; variable < variableEnd; variable++) {
      const x = horizontal ? fixed : variable;
      const y = horizontal ? variable : fixed;
      const index = y * width + x;
      const primary = Math.abs(horizontal ? gradientY[index]! : gradientX[index]!);
      const secondary = Math.abs(horizontal ? gradientX[index]! : gradientY[index]!);
      const normalizedPosition = horizontal
        ? y / Math.max(1, height - 1)
        : x / Math.max(1, width - 1);
      const edgeBias =
        boundary === 'top' || boundary === 'left' ? 1 - normalizedPosition : normalizedPosition;
      const orientationConfidence = primary / Math.max(primary + secondary, Number.EPSILON);
      const score = primary * (0.4 + 0.6 * edgeBias) * (0.25 + 0.75 * orientationConfidence);
      if (score > bestScore) {
        bestScore = score;
        bestPosition = variable;
      }
    }

    if (bestPosition >= 0) {
      const x = horizontal ? fixed : bestPosition;
      const y = horizontal ? bestPosition : fixed;
      samples.push({
        point: new Vector(x, y),
        weight: bestScore,
      });
    }
  }

  return filterBoundarySamples(samples);
}

function filterBoundarySamples(samples: WeightedPoint[]): WeightedPoint[] {
  if (samples.length <= 12) {
    return samples;
  }

  const scoreThreshold = percentile(
    samples.map(({weight}) => weight),
    AUTO_DETECT_SAMPLE_PERCENTILE
  );
  const filteredSamples = samples.filter(({weight}) => weight >= scoreThreshold);
  return filteredSamples.length >= 12 ? filteredSamples : samples;
}

function fitBoundaryLine(samples: WeightedPoint[]): Line | null {
  if (samples.length < 2) {
    return null;
  }

  let activeSamples = samples;
  let fittedLine: Line | null = null;

  for (let i = 0; i < LINE_FIT_ITERATIONS; i++) {
    fittedLine = fitWeightedLine(activeSamples);
    if (!fittedLine) {
      return null;
    }

    const line = fittedLine;
    const distances = activeSamples.map(({point}) => distanceToLine(point, line));
    const distanceThreshold = Math.max(
      AUTO_DETECT_OUTLIER_DISTANCE_PX,
      2.5 * percentile(distances, 0.5)
    );
    const inliers = activeSamples.filter((_, index) => distances[index]! <= distanceThreshold);
    if (inliers.length < 2 || inliers.length === activeSamples.length) {
      break;
    }
    activeSamples = inliers;
  }

  return fitWeightedLine(activeSamples);
}

function fitWeightedLine(samples: WeightedPoint[]): Line | null {
  let weightSum = 0;
  let centerX = 0;
  let centerY = 0;

  for (const {point, weight} of samples) {
    const pointWeight = Math.max(weight, Number.EPSILON);
    weightSum += pointWeight;
    centerX += pointWeight * point.x;
    centerY += pointWeight * point.y;
  }

  if (weightSum <= Number.EPSILON) {
    return null;
  }

  centerX /= weightSum;
  centerY /= weightSum;

  let covarianceXX = 0;
  let covarianceXY = 0;
  let covarianceYY = 0;

  for (const {point, weight} of samples) {
    const pointWeight = Math.max(weight, Number.EPSILON);
    const dx = point.x - centerX;
    const dy = point.y - centerY;
    covarianceXX += pointWeight * dx * dx;
    covarianceXY += pointWeight * dx * dy;
    covarianceYY += pointWeight * dy * dy;
  }

  const angle = 0.5 * Math.atan2(2 * covarianceXY, covarianceXX - covarianceYY);
  const direction = new Vector(Math.cos(angle), Math.sin(angle));
  const normal = new Vector(-direction.y, direction.x);
  return {
    a: normal.x,
    b: normal.y,
    c: -(normal.x * centerX + normal.y * centerY),
  };
}

function distanceToLine({x, y}: Vector, {a, b, c}: Line): number {
  return Math.abs(a * x + b * y + c);
}

function intersectLines(line1: Line, line2: Line): Vector | null {
  const determinant = line1.a * line2.b - line2.a * line1.b;
  if (Math.abs(determinant) <= Number.EPSILON) {
    return null;
  }

  return new Vector(
    (line1.b * line2.c - line2.b * line1.c) / determinant,
    (line2.a * line1.c - line1.a * line2.c) / determinant
  );
}

function isValidDetectedQuadrilateral(vertices: Vector[], width: number, height: number): boolean {
  if (vertices.length !== 4) {
    return false;
  }

  const maxOvershootX = width * AUTO_DETECT_MAX_CORNER_OVERSHOOT_RATIO;
  const maxOvershootY = height * AUTO_DETECT_MAX_CORNER_OVERSHOOT_RATIO;
  if (
    vertices.some(({x, y}) => {
      return (
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        x < -maxOvershootX ||
        x > width + maxOvershootX ||
        y < -maxOvershootY ||
        y > height + maxOvershootY
      );
    })
  ) {
    return false;
  }

  if (!isConvexQuadrilateral(vertices)) {
    return false;
  }

  const area = Math.abs(getPolygonArea(vertices));
  if (area < width * height * AUTO_DETECT_MIN_AREA_RATIO) {
    return false;
  }

  const edgeLengths = vertices.map((vertex, index) => {
    const nextVertex = vertices[(index + 1) % vertices.length]!;
    return vertex.subtract(nextVertex).length();
  });
  return Math.min(...edgeLengths) >= Math.min(width, height) * 0.15;
}

function isConvexQuadrilateral(vertices: Vector[]): boolean {
  let sign = 0;
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i]!;
    const b = vertices[(i + 1) % vertices.length]!;
    const c = vertices[(i + 2) % vertices.length]!;
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (Math.abs(cross) <= Number.EPSILON) {
      return false;
    }
    if (sign === 0) {
      sign = Math.sign(cross);
      continue;
    }
    if (Math.sign(cross) !== sign) {
      return false;
    }
  }
  return true;
}

function getPolygonArea(vertices: Vector[]): number {
  return (
    vertices.reduce((area, vertex, index) => {
      const nextVertex = vertices[(index + 1) % vertices.length]!;
      return area + vertex.x * nextVertex.y - nextVertex.x * vertex.y;
    }, 0) / 2
  );
}

function percentile(values: number[], ratio: number): number {
  if (values.length === 0) {
    return 0;
  }

  const sortedValues = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sortedValues.length - 1,
    Math.max(0, Math.floor(ratio * (sortedValues.length - 1)))
  );
  return sortedValues[index]!;
}
