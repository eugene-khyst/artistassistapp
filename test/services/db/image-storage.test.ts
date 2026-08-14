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

import {type ColorMixture, ColorType} from '@eugene-khyst/artistassistapp-color-mixer';
import {strFromU8, strToU8, unzipSync, zipSync} from 'fflate';
import {deleteDB, type IDBPDatabase, openDB} from 'idb';
import {afterAll, beforeEach, describe, expect, it, vi} from 'vitest';

import {
  createCloudState,
  parseCloudState,
  serializeAndHashCloudState,
} from '@/services/cloud/cloud-state';
import {createStateZip, replaceStateFromZip} from '@/services/cloud/state-zip';
import type {CloudState} from '@/services/cloud/types';
import {getLocalState, replaceLocalStateFromZip} from '@/services/db/cloud-sync-db';
import {dbPromise, deleteDatabase} from '@/services/db/db';
import {
  deleteImageFileAndColorMixturesByDigest,
  getRecentImages,
  readImageBytes,
  saveNewImageFiles,
  saveRepairedImageBytes,
} from '@/services/db/image-file-db';
import {applyMigrations} from '@/services/db/migrations';
import type {ArtistAssistAppDB, LegacyArtistAssistAppDB, StoreName} from '@/services/db/schema';
import {getStoreChangeTokens} from '@/services/db/store-changes-db';
import {type ImageFile, type ImageMetadata, toImageMetadata} from '@/services/image/image-file';
import {digestArrayBuffer} from '@/utils/digest';

const STATE_FILE_NAME = 'artistassistapp-data.json';

function bytes(value: string): ArrayBuffer {
  return new TextEncoder().encode(value).buffer;
}

async function imageFile(
  value: string,
  name: string,
  date = new Date('2026-01-01T00:00:00.000Z')
): Promise<{bytes: ArrayBuffer; image: ImageFile}> {
  const content = bytes(value);
  const digest = await digestArrayBuffer(content);
  return {
    bytes: content,
    image: {
      digest,
      blob: new Blob([content], {type: 'image/png'}),
      type: 'image/png',
      name,
      date,
    },
  };
}

function cloudState(images: ImageFile[] = [], colorMixtures: ColorMixture[] = []): CloudState {
  return createCloudState({
    customBrands: [],
    colorSets: [],
    images: images.map(toImageMetadata),
    colorMixtures,
  });
}

function colorMixture(id: number, key: string, imageFileDigest?: string): ColorMixture {
  return {
    id,
    key,
    type: ColorType.OilPaint,
    colorMixtureRgb: [10, 20, 30],
    parts: [],
    whiteFraction: [0, 1],
    tintRgb: [10, 20, 30],
    consistency: [1, 1],
    layerRgb: [10, 20, 30],
    layerRho: [],
    imageFileDigest,
    date: new Date('2026-01-01T00:00:00.000Z'),
  };
}

function stateZip(entries: Record<string, Uint8Array>): File {
  return new File([zipSync(entries)], 'backup.artistassist', {type: 'application/zip'});
}

async function expectRejectedImportToPreserve(file: File, message: string | RegExp): Promise<void> {
  const existing = await imageFile('existing local photo', 'existing.png');
  await saveNewImageFiles([existing.image]);
  const db = await dbPromise;
  await db.put('color-mixtures', colorMixture(99, 'existing-mixture', existing.image.digest));
  await db.put(
    'local-state-connection',
    {connectionId: 'existing-connection', stateHash: 'existing-hash', userId: 'existing-user'},
    0
  );
  const stateBefore = await getLocalState();

  await expect(replaceStateFromZip(file)).rejects.toThrow(message);

  expect(await getLocalState()).toEqual(stateBefore);
  expect(new Uint8Array(await readImageBytes(existing.image))).toEqual(
    new Uint8Array(existing.bytes)
  );
  expect(await db.get('local-state-connection', 0)).toEqual({
    connectionId: 'existing-connection',
    stateHash: 'existing-hash',
    userId: 'existing-user',
  });
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

async function openLegacyMigrationDatabase(): Promise<{
  db: IDBPDatabase<LegacyArtistAssistAppDB>;
  name: string;
}> {
  const name = `artistassistapp-migration-${crypto.randomUUID()}`;
  const db = await openDB<LegacyArtistAssistAppDB>(name, 1, {
    upgrade(db) {
      db.createObjectStore('migrations', {keyPath: 'id', autoIncrement: true});
      db.createObjectStore('images', {keyPath: 'id', autoIncrement: true});
      db.createObjectStore('image-metadata', {keyPath: 'digest'});
      db.createObjectStore('image-blobs', {keyPath: 'digest'});
    },
  });
  for (const migrationName of [
    '001-image-file-digest',
    '002-color-mixture-underlayer-rgb',
    '004-image-metadata',
    '005-style-image',
    '007-custom-brands-is-white',
  ]) {
    await db.add('migrations', {name: migrationName, appliedAt: new Date()});
  }
  return {db, name};
}

async function closeAndDeleteDatabase(
  db: IDBPDatabase<LegacyArtistAssistAppDB>,
  name: string
): Promise<void> {
  db.close();
  await deleteDB(name);
}

beforeEach(async () => {
  await resetAppDatabase();
});

afterAll(async () => {
  const db = await dbPromise;
  db.close();
  await deleteDatabase();
});

describe('migration 006', () => {
  it('copies healthy legacy bytes, backfills the date, and removes the legacy row', async () => {
    const {db, name} = await openLegacyMigrationDatabase();
    try {
      const {image} = await imageFile('legacy photo', 'legacy.png');
      const legacyDate = new Date('2025-06-01T12:00:00.000Z');
      const metadata = toImageMetadata(image);
      await db.put('image-metadata', {
        ...metadata,
        date: undefined,
      } as unknown as ImageMetadata);
      await db.add('images', {
        digest: image.digest,
        blob: image.blob,
        date: legacyDate,
      });

      await applyMigrations(db);

      const migratedBlob = await db.get('image-blobs', image.digest);
      expect(await migratedBlob?.blob.text()).toBe('legacy photo');
      expect((await db.get('image-metadata', image.digest))?.date).toEqual(legacyDate);
      expect(await db.count('images')).toBe(0);
      expect((await db.getAll('migrations')).map(({name}) => name)).toContain('006-image-blobs');
    } finally {
      await closeAndDeleteDatabase(db, name);
    }
  });

  it('keeps metadata but removes an unreadable legacy row', async () => {
    const {db, name} = await openLegacyMigrationDatabase();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const {image} = await imageFile('expected photo', 'damaged.png');
      await db.put('image-metadata', toImageMetadata(image));
      await db.add('images', {
        digest: image.digest,
        blob: new Blob([bytes('damaged bytes')], {type: image.type}),
        date: image.date,
      });

      await applyMigrations(db);

      expect(await db.get('image-metadata', image.digest)).toBeDefined();
      expect(await db.get('image-blobs', image.digest)).toBeUndefined();
      expect(await db.count('images')).toBe(0);
      expect((await db.getAll('migrations')).map(({name}) => name)).toContain('006-image-blobs');
    } finally {
      errorSpy.mockRestore();
      await closeAndDeleteDatabase(db, name);
    }
  });

  it('resumes after some legacy rows were already migrated', async () => {
    const {db, name} = await openLegacyMigrationDatabase();
    try {
      const migrated = await imageFile('already migrated', 'first.png');
      const pending = await imageFile('pending migration', 'second.png');
      await db.put('image-metadata', toImageMetadata(migrated.image));
      await db.put('image-metadata', toImageMetadata(pending.image));
      await db.put('image-blobs', {
        digest: migrated.image.digest,
        blob: migrated.image.blob,
      });
      await db.add('images', {
        digest: pending.image.digest,
        blob: pending.image.blob,
        date: pending.image.date,
      });

      await applyMigrations(db);

      expect(await (await db.get('image-blobs', migrated.image.digest))?.blob.text()).toBe(
        'already migrated'
      );
      expect(await (await db.get('image-blobs', pending.image.digest))?.blob.text()).toBe(
        'pending migration'
      );
      expect(await db.count('images')).toBe(0);
    } finally {
      await closeAndDeleteDatabase(db, name);
    }
  });

  it('removes a legacy row that has no metadata', async () => {
    const {db, name} = await openLegacyMigrationDatabase();
    try {
      const {image} = await imageFile('orphan legacy photo', 'orphan.png');
      await db.add('images', {
        digest: image.digest,
        blob: image.blob,
        date: image.date,
      });

      await applyMigrations(db);

      expect(await db.count('images')).toBe(0);
      expect(await db.get('image-blobs', image.digest)).toBeUndefined();
      expect((await db.getAll('migrations')).map(({name}) => name)).toContain('006-image-blobs');
    } finally {
      await closeAndDeleteDatabase(db, name);
    }
  });
});

describe('local image storage', () => {
  it('replaces a non-empty state and deletes obsolete blob records', async () => {
    const kept = await imageFile('kept photo', 'kept.png');
    const obsolete = await imageFile('obsolete photo', 'obsolete.png');
    await saveNewImageFiles([kept.image, obsolete.image]);
    const keptDate = new Date('2025-01-02T03:04:05.000Z');
    const db = await dbPromise;
    await db.put('image-metadata', {...toImageMetadata(kept.image), date: keptDate});
    const expectedTokens = await getStoreChangeTokens();

    await replaceLocalStateFromZip(cloudState([kept.image]), [kept.image], expectedTokens);

    expect(await db.get('image-blobs', obsolete.image.digest)).toBeUndefined();
    expect(await db.get('image-metadata', obsolete.image.digest)).toBeUndefined();
    expect((await db.get('image-metadata', kept.image.digest))?.date).toEqual(keptDate);
    expect(new Uint8Array(await readImageBytes(kept.image))).toEqual(new Uint8Array(kept.bytes));
  });

  it('rolls back a replacement when local tokens changed', async () => {
    const first = await imageFile('first photo', 'first.png');
    const second = await imageFile('second photo', 'second.png');
    await saveNewImageFiles([first.image]);
    const staleTokens = await getStoreChangeTokens();
    await saveNewImageFiles([second.image]);

    await expect(replaceLocalStateFromZip(cloudState(), [], staleTokens)).rejects.toThrow(
      'Local data changed during import'
    );

    const db = await dbPromise;
    expect((await db.getAll('image-metadata')).map(({digest}) => digest).sort()).toEqual(
      [first.image.digest, second.image.digest].sort()
    );
  });

  it('repairs only bytes and leaves the serialized state hash unchanged', async () => {
    const healthy = await imageFile('healthy bytes', 'repair.png');
    await saveNewImageFiles([healthy.image]);
    const db = await dbPromise;
    const metadataBefore = await db.get('image-metadata', healthy.image.digest);
    await db.put('image-blobs', {
      digest: healthy.image.digest,
      blob: new Blob([bytes('damaged bytes')], {type: healthy.image.type}),
    });
    const tokensBefore = await getStoreChangeTokens();
    const stateBefore = createCloudState(await getLocalState());
    const hashBefore = (await serializeAndHashCloudState(stateBefore)).hash;

    const repaired = await saveRepairedImageBytes(healthy.image.digest, healthy.bytes);

    expect(repaired).not.toBeNull();
    expect(repaired?.blob.type).toBe(healthy.image.type);
    expect(new Uint8Array(await readImageBytes(healthy.image))).toEqual(
      new Uint8Array(healthy.bytes)
    );
    expect(await db.get('image-metadata', healthy.image.digest)).toEqual(metadataBefore);
    expect(repaired?.tokens.images).not.toBe(tokensBefore.images);
    const hashAfter = (await serializeAndHashCloudState(createCloudState(await getLocalState())))
      .hash;
    expect(hashAfter).toBe(hashBefore);
  });

  it('does not overwrite an orphan blob when its metadata was deleted', async () => {
    const orphan = await imageFile('restored bytes', 'orphan.png');
    const db = await dbPromise;
    await db.put('image-blobs', {
      digest: orphan.image.digest,
      blob: new Blob([bytes('existing orphan')], {type: orphan.image.type}),
    });

    expect(await saveRepairedImageBytes(orphan.image.digest, orphan.bytes)).toBeNull();
    expect(await (await db.get('image-blobs', orphan.image.digest))?.blob.text()).toBe(
      'existing orphan'
    );
  });

  it('deletes a photo and all dependent data without touching unrelated records', async () => {
    const target = await imageFile('deleted photo', 'deleted.png');
    await saveNewImageFiles([target.image]);
    const db = await dbPromise;
    await db.put('color-mixtures', colorMixture(1, 'linked-mixture', target.image.digest));
    await db.put('color-mixtures', colorMixture(2, 'unlinked-mixture'));
    await db.put('processed-images', {
      key: 'linked-processed-image',
      digests: [target.image.digest],
      blob: new Blob(['linked']),
      date: new Date('2026-01-01T00:00:00.000Z'),
    });
    await db.put('processed-images', {
      key: 'unlinked-processed-image',
      digests: ['other-digest'],
      blob: new Blob(['unlinked']),
      date: new Date('2026-01-01T00:00:00.000Z'),
    });

    const tokens = await deleteImageFileAndColorMixturesByDigest(target.image.digest);

    expect(await db.get('image-metadata', target.image.digest)).toBeUndefined();
    expect(await db.get('image-blobs', target.image.digest)).toBeUndefined();
    expect((await db.getAll('color-mixtures')).map(({key}) => key)).toEqual(['unlinked-mixture']);
    expect((await db.getAll('processed-images')).map(({key}) => key)).toEqual([
      'unlinked-processed-image',
    ]);
    expect(tokens.images).toBeDefined();
    expect(tokens['color-mixtures']).toBeDefined();
  });

  it('paginates metadata by recency without hiding a photo whose blob is missing', async () => {
    const oldest = await imageFile('oldest photo', 'oldest.png');
    const middle = await imageFile('middle photo', 'middle.png');
    const missing = await imageFile('missing photo', 'missing.png');
    await saveNewImageFiles([oldest.image, middle.image, missing.image]);
    const db = await dbPromise;
    await db.put('image-metadata', {
      ...toImageMetadata(oldest.image),
      date: new Date('2026-01-01T00:00:00.000Z'),
    });
    await db.put('image-metadata', {
      ...toImageMetadata(middle.image),
      date: new Date('2026-01-02T00:00:00.000Z'),
    });
    await db.put('image-metadata', {
      ...toImageMetadata(missing.image),
      date: new Date('2026-01-03T00:00:00.000Z'),
    });
    await db.delete('image-blobs', missing.image.digest);

    const firstPage = await getRecentImages(0, 2);
    const secondPage = await getRecentImages(2, 2);

    expect(firstPage.images.map(({digest}) => digest)).toEqual([
      missing.image.digest,
      middle.image.digest,
    ]);
    expect(firstPage.images[0]?.blob).toBeUndefined();
    expect(await firstPage.images[1]?.blob?.text()).toBe('middle photo');
    expect(firstPage.hasMore).toBe(true);
    expect(secondPage.images.map(({digest}) => digest)).toEqual([oldest.image.digest]);
    expect(secondPage.hasMore).toBe(false);
  });
});

describe('ZIP backup', () => {
  it('omits unreadable photos and only their dependent color mixtures', async () => {
    const readable = await imageFile('readable photo', 'readable.png');
    const unreadable = await imageFile('expected damaged photo', 'unreadable.png');
    await saveNewImageFiles([readable.image, unreadable.image]);
    const db = await dbPromise;
    await db.put('image-blobs', {
      digest: unreadable.image.digest,
      blob: new Blob([bytes('wrong bytes')], {type: unreadable.image.type}),
    });
    await db.put('color-mixtures', colorMixture(1, 'readable-mixture', readable.image.digest));
    await db.put('color-mixtures', colorMixture(2, 'unreadable-mixture', unreadable.image.digest));
    await db.put('color-mixtures', colorMixture(3, 'unlinked-mixture'));

    const archive = await createStateZip();
    const entries = unzipSync(new Uint8Array(await archive.blob.arrayBuffer()));
    const stateFile = entries[STATE_FILE_NAME];
    const state = stateFile ? parseCloudState(strFromU8(stateFile)) : undefined;

    expect(archive.unavailableImageCount).toBe(1);
    expect(state?.images.map(({digest}) => digest)).toEqual([readable.image.digest]);
    expect(state?.colorMixtures.map(({key}) => key).sort()).toEqual([
      'readable-mixture',
      'unlinked-mixture',
    ]);
    expect(entries[`images/${readable.image.digest}.png`]).toBeDefined();
    expect(entries[`images/${unreadable.image.digest}.png`]).toBeUndefined();
  });

  it('imports a partial backup into a non-empty database', async () => {
    const included = await imageFile('included photo', 'included.png');
    await saveNewImageFiles([included.image]);
    const archive = await createStateZip();

    await resetAppDatabase();
    const obsolete = await imageFile('obsolete local photo', 'obsolete.png');
    await saveNewImageFiles([obsolete.image]);
    const db: IDBPDatabase<ArtistAssistAppDB> = await dbPromise;
    await db.put(
      'local-state-connection',
      {connectionId: 'old-connection', stateHash: 'old-hash', userId: 'old-user'},
      0
    );
    await replaceStateFromZip(
      new File([archive.blob], 'backup.artistassist', {type: 'application/zip'})
    );

    expect(await db.get('image-metadata', obsolete.image.digest)).toBeUndefined();
    expect(await db.get('image-blobs', obsolete.image.digest)).toBeUndefined();
    expect(await db.get('image-metadata', included.image.digest)).toBeDefined();
    expect(new Uint8Array(await readImageBytes(included.image))).toEqual(
      new Uint8Array(included.bytes)
    );
    expect(await db.get('local-state-connection', 0)).toBeUndefined();
  });

  it('rejects a missing state file without changing local data', async () => {
    await expectRejectedImportToPreserve(
      stateZip({unrelated: strToU8('{}')}),
      `Backup file is missing: ${STATE_FILE_NAME}`
    );
  });

  it('rejects invalid state JSON without changing local data', async () => {
    await expectRejectedImportToPreserve(
      stateZip({[STATE_FILE_NAME]: strToU8('{')}),
      `Backup file is invalid: ${STATE_FILE_NAME}`
    );
  });

  it('rejects invalid image metadata without changing local data', async () => {
    await expectRejectedImportToPreserve(
      stateZip({
        [STATE_FILE_NAME]: strToU8(
          JSON.stringify({...cloudState(), images: [{digest: 'invalid', type: 'image/png'}]})
        ),
      }),
      `Backup file is invalid: ${STATE_FILE_NAME}`
    );
  });

  it('rejects a missing image entry without changing local data', async () => {
    const missing = await imageFile('missing backup photo', 'missing.png');
    await expectRejectedImportToPreserve(
      stateZip({[STATE_FILE_NAME]: strToU8(JSON.stringify(cloudState([missing.image])))}),
      `Backup image is missing: ${missing.image.digest}`
    );
  });

  it('rejects corrupted image bytes without changing local data', async () => {
    const corrupted = await imageFile('expected backup photo', 'corrupted.png');
    await expectRejectedImportToPreserve(
      stateZip({
        [STATE_FILE_NAME]: strToU8(JSON.stringify(cloudState([corrupted.image]))),
        [`images/${corrupted.image.digest}.png`]: new Uint8Array(bytes('wrong bytes')),
      }),
      `Backup image is corrupted: ${corrupted.image.digest}`
    );
  });

  it('rejects duplicate image metadata without changing local data', async () => {
    const duplicate = await imageFile('duplicate backup photo', 'duplicate.png');
    const state = cloudState([duplicate.image, duplicate.image]);
    await expectRejectedImportToPreserve(
      stateZip({
        [STATE_FILE_NAME]: strToU8(JSON.stringify(state)),
        [`images/${duplicate.image.digest}.png`]: new Uint8Array(duplicate.bytes),
      }),
      `Backup contains a duplicate image: ${duplicate.image.digest}`
    );
  });
});
