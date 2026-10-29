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

import {
  linearizeRgbChannel,
  PAPER_WHITE,
  type RgbTuple,
  unlinearizeRgbChannel,
} from '@eugene-khyst/artistassistapp-color-mixer';
import {Rectangle, Vector} from '@eugene-khyst/artistassistapp-image-processing/math/geometry';
import {describe, expect, it} from 'vitest';

import {
  findMixtureRegions,
  MixturePhotoProblem,
  sampleMixturePhoto,
} from '@/services/image/compare-mixture';

function photo() {
  const canvas = new OffscreenCanvas(320, 160);
  const context = canvas.getContext('2d')!;
  const reference: RgbTuple = [230, 210, 190];
  const target: RgbTuple = [60, 110, 150];
  const photographed = target.map((v, i) =>
    unlinearizeRgbChannel(
      (linearizeRgbChannel(v) * linearizeRgbChannel(reference[i]!)) /
        linearizeRgbChannel(PAPER_WHITE[i]!)
    )
  );
  context.fillStyle = `rgb(${reference.join(',')})`;
  context.fillRect(0, 0, 160, 160);
  context.fillStyle = `rgb(${photographed.join(',')})`;
  context.fillRect(160, 0, 160, 160);
  return {canvas, target, reference};
}

describe('mixture photo comparison', () => {
  it('detects editable areas and corrects the average of the selected mixture', () => {
    const {canvas, target, reference} = photo();
    const regions = findMixtureRegions(canvas, target);
    const samples = sampleMixturePhoto(canvas, regions);
    expect(samples.problem).toBeNull();
    expect(samples.reference).toEqual(reference);
    samples.mixture!.forEach((value, i) => {
      expect(Math.abs(value - target[i]!)).toBeLessThanOrEqual(1);
    });
  });

  it('infers white and mixture regardless of rectangle order', () => {
    const {canvas} = photo();
    const white = Rectangle.fromTopLeft(Vector.ZERO, 100, 100);
    const mix = Rectangle.fromTopLeft(new Vector(180, 0), 100, 100);
    const forward = sampleMixturePhoto(canvas, [white, mix]);
    expect(sampleMixturePhoto(canvas, [mix, white])).toEqual(forward);
    expect(forward.problem).toBeNull();
  });

  it('averages the whole selected area, including its right-hand half', () => {
    const {canvas} = photo();
    const context = canvas.getContext('2d')!;
    context.fillStyle = 'rgb(200,50,50)';
    context.fillRect(240, 0, 80, 160);
    const regions = [
      Rectangle.fromTopLeft(Vector.ZERO, 100, 100),
      Rectangle.fromTopLeft(new Vector(160, 0), 160, 100),
    ] as const;
    const full = sampleMixturePhoto(canvas, regions).mixture!;
    const left = sampleMixturePhoto(canvas, [
      regions[0],
      Rectangle.fromTopLeft(new Vector(160, 0), 80, 100),
    ]).mixture!;
    expect(full[0]).toBeGreaterThan(left[0]);
    expect(full[2]).toBeLessThan(left[2]);
  });

  it('withholds recommendations for overlapping areas or clipped reference paper', () => {
    const {canvas} = photo();
    const reference = Rectangle.fromTopLeft(Vector.ZERO, 100, 100);
    expect(sampleMixturePhoto(canvas, [reference, reference]).problem).toBe(
      MixturePhotoProblem.OverlappingRegions
    );
    canvas.getContext('2d')!.fillStyle = '#fff';
    canvas.getContext('2d')!.fillRect(0, 0, 160, 160);
    const result = sampleMixturePhoto(canvas, [
      reference,
      Rectangle.fromTopLeft(new Vector(180, 0), 100, 100),
    ]);
    expect(result.problem).toBe(MixturePhotoProblem.InvalidReference);
    expect(result.mixture).toBeNull();
  });

  it('rejects white paper with glare on part of the selected area', () => {
    const {canvas} = photo();
    const reference = Rectangle.fromTopLeft(Vector.ZERO, 100, 100);
    const mix = Rectangle.fromTopLeft(new Vector(180, 0), 100, 100);
    expect(sampleMixturePhoto(canvas, [reference, mix]).problem).toBeNull();
    canvas.getContext('2d')!.fillStyle = '#fff';
    canvas.getContext('2d')!.fillRect(0, 0, 100, 10);
    expect(sampleMixturePhoto(canvas, [reference, mix]).problem).toBe(
      MixturePhotoProblem.InvalidReference
    );
  });
});
