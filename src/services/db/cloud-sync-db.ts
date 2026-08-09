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

import {fromCustomColorBrandSource} from '@/services/cloud/cloud-state';
import {CloudError, CloudErrorType} from '@/services/cloud/errors';
import type {
  CloudState,
  CloudSync,
  CloudSyncResult,
  CloudSyncType,
  LocalStateConnection,
} from '@/services/cloud/types';
import {EMPTY_DIGEST} from '@/services/db/color-mixture-db';
import {dbPromise, type DBReadWriteTransaction} from '@/services/db/db';
import {saveNewImageFiles} from '@/services/db/image-file-db';
import {getStoreChangeTokens, markStoreChanged} from '@/services/db/store-changes-db';
import {areStoreChangeTokensEqual, type StoreChangeTokens} from '@/services/db/types';
import {ImageUnreadableError} from '@/services/image/errors';
import type {ImageFile} from '@/services/image/image-file';
import {readStoredImageBytes} from '@/services/image/image-file';

const KEY = 0;

export async function getLocalState() {
  const db = await dbPromise;
  const tx = db.transaction([
    'custom-brands',
    'color-sets',
    'image-metadata',
    'color-mixtures',
    'store-changes',
  ]);
  const [customBrands, colorSets, images, colorMixtures, storeChangeTokens] = await Promise.all([
    tx.objectStore('custom-brands').getAll(),
    tx.objectStore('color-sets').getAll(),
    tx.objectStore('image-metadata').getAll(),
    tx.objectStore('color-mixtures').getAll(),
    getStoreChangeTokens(tx),
  ]);
  await tx.done;
  return {customBrands, colorSets, images, colorMixtures, storeChangeTokens};
}

export async function getLocalStateWithImageBytes() {
  const db = await dbPromise;
  const tx = db.transaction([
    'custom-brands',
    'color-sets',
    'image-blobs',
    'image-metadata',
    'color-mixtures',
  ]);
  const customBrandsPromise = tx.objectStore('custom-brands').getAll();
  const colorSetsPromise = tx.objectStore('color-sets').getAll();
  const colorMixturesPromise = tx.objectStore('color-mixtures').getAll();
  const images = await tx.objectStore('image-metadata').getAll();
  const imageBlobsPromise = Promise.all(
    images.map(({digest}) => tx.objectStore('image-blobs').get(digest))
  );
  const [customBrands, colorSets, colorMixtures, imageBlobs] = await Promise.all([
    customBrandsPromise,
    colorSetsPromise,
    colorMixturesPromise,
    imageBlobsPromise,
  ]);
  await tx.done;
  const imageBytesByDigest = new Map<string, ArrayBuffer>();
  const unavailableImageDigests = new Set<string>();
  for (const [index, image] of images.entries()) {
    try {
      imageBytesByDigest.set(image.digest, await readStoredImageBytes(image, imageBlobs[index]));
    } catch (error) {
      if (!(error instanceof ImageUnreadableError)) {
        throw error;
      }
      unavailableImageDigests.add(image.digest);
    }
  }
  return {
    customBrands,
    colorSets,
    images,
    imageBytesByDigest,
    unavailableImageDigests,
    colorMixtures,
  };
}

export async function getCloudSync(connectionId: string): Promise<CloudSync | undefined> {
  const db = await dbPromise;
  return await db.get('cloud-sync', connectionId);
}

export async function getLocalStateConnection(): Promise<LocalStateConnection | undefined> {
  const db = await dbPromise;
  return await db.get('local-state-connection', KEY);
}

export async function saveCloudSync(
  cloudSync: CloudSync,
  localStateConnection: LocalStateConnection
): Promise<void> {
  const db = await dbPromise;
  const tx = db.transaction(['cloud-sync', 'local-state-connection'], 'readwrite');
  await tx.objectStore('cloud-sync').put(cloudSync);
  await tx.objectStore('local-state-connection').put(localStateConnection, KEY);
  await tx.done;
}

// Records that already existed locally keep their "last used" dates through a restore.
function datesById(records: {id?: number; date?: Date | null}[]): Map<number, Date> {
  return new Map(
    records.flatMap(({id, date}): [number, Date][] =>
      id !== undefined && date ? [[id, date]] : []
    )
  );
}

async function writeLocalState(
  tx: DBReadWriteTransaction,
  remoteState: CloudState,
  remoteImages: ImageFile[],
  currentTokens: StoreChangeTokens
): Promise<StoreChangeTokens> {
  const date = new Date();
  const customBrandsStore = tx.objectStore('custom-brands');
  const customBrandDates = datesById(await customBrandsStore.getAll());
  await customBrandsStore.clear();
  for (const customBrand of remoteState.customBrands) {
    const brand = fromCustomColorBrandSource(customBrand);
    await customBrandsStore.put({
      ...brand,
      date: customBrandDates.get(brand.id!) ?? date,
    });
  }
  const colorSetsStore = tx.objectStore('color-sets');
  const colorSetDates = datesById(await colorSetsStore.getAll());
  await colorSetsStore.clear();
  for (const colorSet of remoteState.colorSets) {
    await colorSetsStore.put({
      ...colorSet,
      date: colorSetDates.get(colorSet.id!) ?? date,
    });
  }
  const remoteImageDigests = new Set(remoteState.images.map(({digest}) => digest));
  const imageMetadataStore = tx.objectStore('image-metadata');
  const imageBlobsStore = tx.objectStore('image-blobs');
  // Delete only; WebKit corrupts rewritten blobs (240216).
  for (const digest of await imageBlobsStore.getAllKeys()) {
    if (!remoteImageDigests.has(digest)) {
      await imageBlobsStore.delete(digest);
    }
  }
  const imageTokens = await saveNewImageFiles(remoteImages, {
    tx,
    preserveDate: true,
  });
  const imageDatesByDigest = new Map(
    (await imageMetadataStore.getAll()).map(({digest, date}) => [digest, date] as const)
  );
  await imageMetadataStore.clear();
  for (const imageMetadata of remoteState.images) {
    await imageMetadataStore.put({
      ...imageMetadata,
      date: imageDatesByDigest.get(imageMetadata.digest) ?? date,
    });
  }
  const colorMixturesStore = tx.objectStore('color-mixtures');
  const colorMixtureDates = datesById(await colorMixturesStore.getAll());
  await colorMixturesStore.clear();
  for (const colorMixture of remoteState.colorMixtures) {
    await colorMixturesStore.put({
      ...colorMixture,
      imageFileDigest: colorMixture.imageFileDigest ?? EMPTY_DIGEST,
      date: colorMixtureDates.get(colorMixture.id!) ?? date,
    });
  }
  return {
    ...currentTokens,
    'custom-brands': await markStoreChanged(tx, 'custom-brands'),
    'color-sets': await markStoreChanged(tx, 'color-sets'),
    ...imageTokens,
    'color-mixtures': await markStoreChanged(tx, 'color-mixtures'),
  };
}

export async function replaceLocalStateFromCloud(
  {
    remoteState,
    remoteImages,
    cloudSync,
    stateHash,
  }: Omit<Extract<CloudSyncResult, {type: CloudSyncType.Download}>, 'type'>,
  expectedTokens: StoreChangeTokens,
  userId: string
): Promise<StoreChangeTokens> {
  const db = await dbPromise;
  const tx = db.transaction(
    [
      'custom-brands',
      'color-sets',
      'image-blobs',
      'image-metadata',
      'color-mixtures',
      'cloud-sync',
      'local-state-connection',
      'store-changes',
    ],
    'readwrite'
  );
  const currentTokens = await getStoreChangeTokens(tx);
  if (!areStoreChangeTokensEqual(currentTokens, expectedTokens)) {
    throw new CloudError(
      CloudErrorType.SyncConflict,
      'Local data changed while cloud state was downloading'
    );
  }
  const updatedTokens = await writeLocalState(tx, remoteState, remoteImages, currentTokens);
  await tx.objectStore('cloud-sync').put(cloudSync);
  await tx.objectStore('local-state-connection').put(
    {
      connectionId: cloudSync.connectionId,
      stateHash,
      userId,
    },
    KEY
  );
  await tx.done;
  return updatedTokens;
}

export async function replaceLocalStateFromZip(
  state: CloudState,
  images: ImageFile[],
  expectedTokens: StoreChangeTokens
): Promise<StoreChangeTokens> {
  const db = await dbPromise;
  const tx = db.transaction(
    [
      'custom-brands',
      'color-sets',
      'image-blobs',
      'image-metadata',
      'color-mixtures',
      'local-state-connection',
      'store-changes',
    ],
    'readwrite'
  );
  const currentTokens = await getStoreChangeTokens(tx);
  if (!areStoreChangeTokensEqual(currentTokens, expectedTokens)) {
    throw new Error('Local data changed during import');
  }
  const updatedTokens = await writeLocalState(tx, state, images, currentTokens);
  await tx.objectStore('local-state-connection').delete(KEY);
  await tx.done;
  return updatedTokens;
}
