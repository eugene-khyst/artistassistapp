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

import {describe, expect, it} from 'vitest';

import {
  createCloudState,
  fromCustomColorBrandSource,
  parseCloudState,
  serializeAndHashCloudState,
  serializeCloudState,
  toCustomColorBrandSource,
} from '@/services/cloud/cloud-state';
import {EMPTY_CLOUD_STATE} from '@/services/cloud/types';
import {ColorType, type ColorMixture} from '@/services/color/types';
import type {ImageMetadata} from '@/services/image/image-file';
import {validateCloudState, validateCustomColorBrandJson} from '@/services/validation';

const FIRST_DIGEST = '1'.repeat(64);
const SECOND_DIGEST = '2'.repeat(64);

function image(digest: string, name: string, date: Date): ImageMetadata {
  return {digest, name, type: 'image/png', date};
}

function stateFromImages(images: ImageMetadata[]) {
  return createCloudState({customBrands: [], colorSets: [], images, colorMixtures: []});
}

function mixture(id: number, imageFileDigest: string, date: Date): ColorMixture {
  return {
    id,
    key: `mixture-${id}`,
    type: ColorType.OilPaint,
    colorMixtureRgb: [1, 2, 3],
    parts: [],
    whiteFraction: [0, 1],
    tintRgb: [1, 2, 3],
    consistency: [1, 1],
    layerRgb: [1, 2, 3],
    layerRho: new Float64Array([0.1, 0.2]),
    imageFileDigest,
    date,
  };
}

describe('cloud state', () => {
  it('produces the same canonical state regardless of image dates and input order', () => {
    const first = stateFromImages([
      image(SECOND_DIGEST, 'second.png', new Date('2025-01-01T00:00:00.000Z')),
      image(FIRST_DIGEST, 'first.png', new Date('2025-02-01T00:00:00.000Z')),
    ]);
    const second = stateFromImages([
      image(FIRST_DIGEST, 'first.png', new Date('2030-01-01T00:00:00.000Z')),
      image(SECOND_DIGEST, 'second.png', new Date('2030-02-01T00:00:00.000Z')),
    ]);

    expect(first).toEqual(second);
    expect(first.images.map(({digest}) => digest)).toEqual([FIRST_DIGEST, SECOND_DIGEST]);
  });

  it('canonicalizes brands, color sets, mixtures, dates, and typed reflectance arrays', () => {
    const early = new Date('2025-01-01T00:00:00.000Z');
    const late = new Date('2030-01-01T00:00:00.000Z');
    const first = createCloudState({
      customBrands: [
        {id: 2, name: 'Second brand', date: early},
        {id: 1, name: 'First brand', date: late},
      ],
      colorSets: [
        {id: 2, name: 'Second set', date: early},
        {id: 1, name: 'First set', date: late},
      ],
      images: [],
      colorMixtures: [mixture(2, 'b', early), mixture(1, 'a', late)],
    });
    const second = createCloudState({
      customBrands: [
        {id: 1, name: 'First brand', date: early},
        {id: 2, name: 'Second brand', date: late},
      ],
      colorSets: [
        {id: 1, name: 'First set', date: early},
        {id: 2, name: 'Second set', date: late},
      ],
      images: [],
      colorMixtures: [mixture(1, 'a', early), mixture(2, 'b', late)],
    });

    expect(first).toEqual(second);
    expect(first.customBrands.map(({id}) => id)).toEqual([1, 2]);
    expect(first.colorSets.map(({id}) => id)).toEqual([1, 2]);
    expect(first.colorMixtures.map(({id}) => id)).toEqual([1, 2]);
    expect(first.colorMixtures[0]?.layerRho).toEqual([0.1, 0.2]);
  });

  it('changes the hash when serialized content changes', async () => {
    const original = stateFromImages([
      image(FIRST_DIGEST, 'first.png', new Date('2025-01-01T00:00:00.000Z')),
    ]);
    const renamed = stateFromImages([
      image(FIRST_DIGEST, 'renamed.png', new Date('2025-01-01T00:00:00.000Z')),
    ]);

    expect((await serializeAndHashCloudState(original)).hash).not.toBe(
      (await serializeAndHashCloudState(renamed)).hash
    );
  });

  it('round-trips serialized state', () => {
    const state = stateFromImages([
      image(FIRST_DIGEST, 'first.png', new Date('2025-01-01T00:00:00.000Z')),
    ]);

    expect(parseCloudState(serializeCloudState(state))).toEqual(state);
  });
});

describe('external state validation', () => {
  it('rejects malformed JSON and incomplete state objects', () => {
    expect(parseCloudState('{')).toBeUndefined();
    expect(validateCloudState({images: []})).toBeUndefined();
  });

  it('rejects invalid image and color-mixture shapes', () => {
    expect(
      validateCloudState({
        ...EMPTY_CLOUD_STATE,
        images: [{digest: 42, type: 'image/png'}],
      })
    ).toBeUndefined();
    expect(
      validateCloudState({
        ...EMPTY_CLOUD_STATE,
        images: [{digest: 'invalid', type: 'image/png'}],
      })
    ).toBeUndefined();
    expect(
      validateCloudState({
        ...EMPTY_CLOUD_STATE,
        images: [{digest: FIRST_DIGEST, type: ''}],
      })
    ).toBeUndefined();
    expect(
      validateCloudState({
        ...EMPTY_CLOUD_STATE,
        colorMixtures: [{}],
      })
    ).toBeUndefined();
  });

  it('accepts a custom brand source without derived reflectance values', () => {
    expect(
      validateCustomColorBrandJson({
        name: 'Custom',
        colors: [{id: 1, name: 'Red', hex: '#ff0000'}],
      })
    ).toEqual({
      name: 'Custom',
      colors: [{id: 1, name: 'Red', hex: '#ff0000'}],
    });
  });

  it('reconstructs derived reflectance without adding it to the cloud source', () => {
    const source = {
      id: 1,
      type: ColorType.OilPaint,
      name: 'Custom',
      colors: [{id: 1, name: 'Red', hex: '#ff0000'}],
    };

    const stored = fromCustomColorBrandSource(source);

    expect(stored.colors?.[0]?.rho.length).toBeGreaterThan(0);
    expect(toCustomColorBrandSource(stored)).toEqual(source);
  });
});
