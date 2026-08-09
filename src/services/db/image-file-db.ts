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

import type {DBReadWriteTransaction} from '@/services/db/db';
import {markStoreChanged} from '@/services/db/store-changes-db';
import type {StoreChangeTokens} from '@/services/db/types';
import {ImageUnreadableError} from '@/services/image/errors';
import type {ImageFile, ImageMetadata, RecentImage} from '@/services/image/image-file';
import {readStoredImageBytes, toImageBlob, toImageMetadata} from '@/services/image/image-file';

import {dbPromise} from './db';

export interface RecentImagePage {
  images: RecentImage[];
  hasMore: boolean;
}

export async function getRecentImages(offset: number, limit: number): Promise<RecentImagePage> {
  const db = await dbPromise;
  const tx = db.transaction(['image-blobs', 'image-metadata']);
  const imageBlobsStore = tx.objectStore('image-blobs');
  const index = tx.objectStore('image-metadata').index('by-date');
  let cursor = await index.openCursor(null, 'prev');
  if (cursor && offset > 0) {
    cursor = await cursor.advance(offset);
  }
  const images: RecentImage[] = [];
  while (cursor && images.length < limit) {
    const imageBlob = await imageBlobsStore.get(cursor.value.digest);
    images.push({...cursor.value, ...(imageBlob ? {blob: imageBlob.blob} : {})});
    cursor = await cursor.continue();
  }
  await tx.done;
  return {images, hasMore: !!cursor};
}

export async function getOldestImageDigest(): Promise<string | undefined> {
  const db = await dbPromise;
  const cursor = await db.transaction('image-metadata').store.index('by-date').openCursor();
  return cursor?.value.digest;
}

export async function countImageFiles(): Promise<number> {
  const db = await dbPromise;
  return await db.count('image-metadata');
}

export async function readImageBytes(
  image: Pick<ImageMetadata, 'digest' | 'name'>
): Promise<ArrayBuffer> {
  const db = await dbPromise;
  const imageBlob = await db.get('image-blobs', image.digest);
  return await readStoredImageBytes(image, imageBlob);
}

export async function getReadableImageDigests(
  digests: string[],
  signal?: AbortSignal
): Promise<Set<string>> {
  signal?.throwIfAborted();
  const db = await dbPromise;
  signal?.throwIfAborted();
  const tx = db.transaction('image-blobs');
  const imageBlobs = await Promise.all(digests.map(digest => tx.store.get(digest)));
  await tx.done;
  signal?.throwIfAborted();
  const readableDigests = new Set<string>();
  for (const [index, digest] of digests.entries()) {
    signal?.throwIfAborted();
    try {
      await readStoredImageBytes({digest}, imageBlobs[index]);
      signal?.throwIfAborted();
      readableDigests.add(digest);
    } catch (error) {
      signal?.throwIfAborted();
      if (!(error instanceof ImageUnreadableError)) {
        throw error;
      }
    }
  }
  return readableDigests;
}

export async function hasImageFile(digest: string): Promise<boolean> {
  const db = await dbPromise;
  return (await db.count('image-metadata', digest)) > 0;
}

export async function saveNewImageFiles(
  imageFiles: ImageFile[],
  {
    preserveDate = false,
    tx: existingTx,
  }: {
    preserveDate?: boolean;
    tx?: DBReadWriteTransaction;
  } = {}
): Promise<StoreChangeTokens> {
  const tx =
    existingTx ??
    (await dbPromise).transaction(['image-blobs', 'image-metadata', 'store-changes'], 'readwrite');
  const imageBlobsStore = tx.objectStore('image-blobs');
  const imageMetadataStore = tx.objectStore('image-metadata');
  for (const imageFile of imageFiles) {
    const existingImageMetadata = await imageMetadataStore.get(imageFile.digest);
    // A restore rewrites the photo but keeps the local "last used" date.
    imageFile.date = preserveDate ? (existingImageMetadata?.date ?? imageFile.date) : new Date();
    await imageBlobsStore.put(toImageBlob(imageFile));
    await imageMetadataStore.put(toImageMetadata(imageFile));
  }
  const tokens: StoreChangeTokens = {
    images: await markStoreChanged(tx, 'images'),
  };
  if (!existingTx) {
    await tx.done;
  }
  return tokens;
}

export interface RepairedImage {
  blob: Blob;
  tokens: StoreChangeTokens;
}

// Metadata is only read: repair must not resurrect a photo deleted while it was downloading.
export async function saveRepairedImageBytes(
  digest: string,
  bytes: ArrayBuffer
): Promise<RepairedImage | null> {
  const db = await dbPromise;
  const tx = db.transaction(['image-blobs', 'image-metadata', 'store-changes'], 'readwrite');
  const imageMetadata = await tx.objectStore('image-metadata').get(digest);
  if (!imageMetadata) {
    await tx.done;
    return null;
  }
  const blob = new Blob([bytes], {type: imageMetadata.type});
  await tx.objectStore('image-blobs').put({digest, blob});
  const tokens: StoreChangeTokens = {
    images: await markStoreChanged(tx, 'images'),
  };
  await tx.done;
  return {blob, tokens};
}

export async function touchImage(digest: string, date: Date): Promise<StoreChangeTokens> {
  const db = await dbPromise;
  const tx = db.transaction(['image-metadata', 'store-changes'], 'readwrite');
  const imageMetadataStore = tx.objectStore('image-metadata');
  const imageMetadata = await imageMetadataStore.get(digest);
  if (!imageMetadata) {
    throw new Error(`Local image is missing: ${digest}`);
  }
  await imageMetadataStore.put({...imageMetadata, date});
  const tokens: StoreChangeTokens = {
    images: await markStoreChanged(tx, 'images'),
  };
  await tx.done;
  return tokens;
}

async function deleteImageFileAndColorMixtures(
  tx: DBReadWriteTransaction,
  digest: string
): Promise<StoreChangeTokens> {
  await tx.objectStore('image-blobs').delete(digest);
  await tx.objectStore('image-metadata').delete(digest);
  const colorMixturesStore = tx.objectStore('color-mixtures');
  const colorMixtureIds = await colorMixturesStore.index('by-imageFileDigest').getAllKeys(digest);
  for (const id of colorMixtureIds) {
    await colorMixturesStore.delete(id);
  }
  const processedImagesStore = tx.objectStore('processed-images');
  const processedImageKeys = await processedImagesStore.index('by-digest').getAllKeys(digest);
  for (const key of processedImageKeys) {
    await processedImagesStore.delete(key);
  }
  return {
    images: await markStoreChanged(tx, 'images'),
    'color-mixtures': await markStoreChanged(tx, 'color-mixtures'),
  };
}

export async function deleteImageFileAndColorMixturesByDigest(
  digest: string
): Promise<StoreChangeTokens> {
  const db = await dbPromise;
  const tx = db.transaction(
    ['image-blobs', 'image-metadata', 'color-mixtures', 'processed-images', 'store-changes'],
    'readwrite'
  );
  const tokens = await deleteImageFileAndColorMixtures(tx, digest);
  await tx.done;
  return tokens;
}
