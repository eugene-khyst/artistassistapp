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

import {afterAll, beforeEach, describe, expect, it} from 'vitest';

import type {AuthSession} from '@/services/auth/types';
import {getAppSettings} from '@/services/db/app-settings-db';
import {getAuthSession, saveAuthSession, saveAuthSessionIfUnchanged} from '@/services/db/auth-db';
import {dbPromise, deleteDatabase} from '@/services/db/db';
import {getProcessedImage, saveProcessedImage} from '@/services/db/processed-image-db';
import type {StoreName} from '@/services/db/schema';
import {discardStyleImage, getStyleImage, saveStyleImage} from '@/services/db/style-image-db';
import type {ImageFile} from '@/services/image/image-file';
import type {OnnxModel} from '@/services/ml/types';
import {digestArrayBuffer} from '@/utils/digest';

const MODEL: OnnxModel = {
  id: 'model',
  name: 'Model',
  description: 'Description',
  image: 'model.png',
  url: 'model.onnx',
  resolution: 512,
  priority: 1,
  freeTier: true,
};

function bytes(value: string): ArrayBuffer {
  return new TextEncoder().encode(value).buffer;
}

async function imageFile(value: string): Promise<ImageFile> {
  const content = bytes(value);
  return {
    digest: await digestArrayBuffer(content),
    blob: new Blob([content], {type: 'image/png'}),
    type: 'image/png',
    name: 'style.png',
    date: new Date('2026-01-01T00:00:00.000Z'),
  };
}

function session(idToken: string): AuthSession {
  return {idToken, refreshExpiresAt: new Date('2026-12-01T00:00:00.000Z')};
}

async function resetAppDatabase(): Promise<void> {
  const db = await dbPromise;
  const storeNames = [...db.objectStoreNames].filter(
    (name): name is StoreName => name !== 'migrations'
  );
  const tx = db.transaction(storeNames, 'readwrite');
  await Promise.all(storeNames.map(name => tx.objectStore(name).clear()));
  await tx.done;
}

beforeEach(async () => {
  await resetAppDatabase();
});

afterAll(async () => {
  const db = await dbPromise;
  db.close();
  await deleteDatabase();
});

describe('style image storage', () => {
  it('saves the image and configured digest together', async () => {
    const image = await imageFile('style image');

    const settings = await saveStyleImage(image);

    expect(settings.styleTransferImageDigest).toBe(image.digest);
    expect((await getAppSettings())?.styleTransferImageDigest).toBe(image.digest);
    expect((await getStyleImage())?.digest).toBe(image.digest);
    expect(await (await getStyleImage())?.blob.text()).toBe('style image');
  });

  it('does not discard a newer style image for a stale digest', async () => {
    const image = await imageFile('current style image');
    await saveStyleImage(image);

    const result = await discardStyleImage('stale-digest');

    expect(result.discarded).toBe(false);
    expect(result.appSettings.styleTransferImageDigest).toBe(image.digest);
    expect((await getStyleImage())?.digest).toBe(image.digest);
  });

  it('removes the image and configured digest together', async () => {
    const image = await imageFile('discarded style image');
    await saveStyleImage(image);

    const result = await discardStyleImage(image.digest);

    expect(result.discarded).toBe(true);
    expect(result.appSettings.styleTransferImageDigest).toBeUndefined();
    expect(await getStyleImage()).toBeUndefined();
    expect((await getAppSettings())?.styleTransferImageDigest).toBeUndefined();
  });
});

describe('auth session storage', () => {
  it('replaces a session only when the expected token is still current', async () => {
    const current = session('current');
    const refreshed = session('refreshed');
    await saveAuthSession(current);

    expect(await saveAuthSessionIfUnchanged(current.idToken, refreshed)).toEqual(refreshed);
    expect(await getAuthSession()).toEqual(refreshed);
  });

  it('does not let a stale refresh overwrite a newer session', async () => {
    const newer = session('newer');
    await saveAuthSession(newer);

    expect(await saveAuthSessionIfUnchanged('stale', session('stale-refresh'))).toEqual(newer);
    expect(await getAuthSession()).toEqual(newer);
  });

  it('does not create a session when the expected session is missing', async () => {
    expect(await saveAuthSessionIfUnchanged('missing', session('refreshed'))).toBeUndefined();
    expect(await getAuthSession()).toBeUndefined();
  });
});

describe('processed image cache', () => {
  it('ignores presentation-only model fields in the cache key', async () => {
    await saveProcessedImage(MODEL, ['input'], new Blob(['cached']));

    const cached = await getProcessedImage(
      {
        ...MODEL,
        name: 'Renamed',
        description: 'Changed description',
        image: 'changed.png',
        priority: 99,
        freeTier: false,
      },
      ['input']
    );

    expect(await cached?.text()).toBe('cached');
  });

  it('includes inference fields and ordered input digests in the cache key', async () => {
    await saveProcessedImage(MODEL, ['first', 'second'], new Blob(['cached']));

    expect(
      await getProcessedImage({...MODEL, resolution: 256}, ['first', 'second'])
    ).toBeUndefined();
    expect(await getProcessedImage(MODEL, ['second', 'first'])).toBeUndefined();
  });

  it('evicts the oldest entries beyond the cache limit', async () => {
    const db = await dbPromise;
    for (let i = 0; i < 20; i++) {
      const digest = `input-${i}`;
      await saveProcessedImage(MODEL, [digest], new Blob([`cached-${i}`]));
      const entry = (await db.getAll('processed-images')).find(
        ({digests}) => digests[0] === digest
      )!;
      await db.put('processed-images', {
        ...entry,
        blob: new Blob([`cached-${i}`]),
        date: new Date(Date.UTC(2025, 0, 1, 0, 0, i)),
      });
    }
    await saveProcessedImage(MODEL, ['input-20'], new Blob(['cached-20']));

    expect(await db.count('processed-images')).toBe(20);
    expect(await getProcessedImage(MODEL, ['input-0'])).toBeUndefined();
    expect(await (await getProcessedImage(MODEL, ['input-20']))?.text()).toBe('cached-20');
  });
});
