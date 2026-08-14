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

import dayjs from 'dayjs';
import {type AsyncZippable, strFromU8, strToU8, unzip, type Unzipped, zip} from 'fflate';

import {withCloudLock} from '@/services/cloud/cloud-lock';
import {createCloudState, parseCloudState} from '@/services/cloud/cloud-state';
import {type CloudImage, type CloudState, FileExtension} from '@/services/cloud/types';
import {getLocalStateWithImageBytes, replaceLocalStateFromZip} from '@/services/db/cloud-sync-db';
import {getStoreChangeTokens} from '@/services/db/store-changes-db';
import type {StoreChangeTokens} from '@/services/db/types';
import type {ImageFile} from '@/services/image/image-file';
import {digestArrayBuffer} from '@/utils/digest';
import {getExtensionForMimeType} from '@/utils/mime';

const IMAGES_DIRECTORY = 'images';
const ZIP_STATE_FILE_NAME = 'artistassistapp-data.json';

function imagePath({digest, type}: CloudImage): string {
  const extension = getExtensionForMimeType(type) ?? 'bin';
  return `${IMAGES_DIRECTORY}/${digest}.${extension}`;
}

function createZip(entries: AsyncZippable): Promise<Uint8Array<ArrayBuffer>> {
  return new Promise((resolve, reject) => {
    zip(entries, {level: 0}, (error, data) => {
      if (error) {
        reject(error);
      } else {
        resolve(data);
      }
    });
  });
}

function readZip(data: Uint8Array<ArrayBuffer>): Promise<Unzipped> {
  return new Promise((resolve, reject) => {
    unzip(data, (error, entries) => {
      if (error) {
        reject(error);
      } else {
        resolve(entries);
      }
    });
  });
}

function validateImages(state: CloudState, entries: Unzipped): Promise<ImageFile[]> {
  const digests = new Set<string>();
  return Promise.all(
    state.images.map(async (image): Promise<ImageFile> => {
      if (
        typeof image.digest !== 'string' ||
        !/^[\da-f]{64}$/.test(image.digest) ||
        typeof image.type !== 'string' ||
        !image.type
      ) {
        throw new Error('Backup contains invalid image metadata');
      }
      if (digests.has(image.digest)) {
        throw new Error(`Backup contains a duplicate image: ${image.digest}`);
      }
      digests.add(image.digest);

      const data = entries[imagePath(image)];
      if (!data) {
        throw new Error(`Backup image is missing: ${image.digest}`);
      }
      if ((await digestArrayBuffer(data)) !== image.digest) {
        throw new Error(`Backup image is corrupted: ${image.digest}`);
      }
      return {
        ...image,
        blob: new Blob([data], {type: image.type}),
        date: new Date(),
      };
    })
  );
}

export interface StateZip {
  blob: Blob;
  unavailableImageCount: number;
}

export async function createStateZip(): Promise<StateZip> {
  const {
    customBrands,
    colorSets,
    images,
    imageBytesByDigest,
    unavailableImageDigests,
    colorMixtures,
  } = await withCloudLock(() => getLocalStateWithImageBytes());
  const state = createCloudState({
    customBrands,
    colorSets,
    images: images.filter(({digest}) => !unavailableImageDigests.has(digest)),
    colorMixtures: colorMixtures.filter(
      ({imageFileDigest}) => !imageFileDigest || !unavailableImageDigests.has(imageFileDigest)
    ),
  });
  const entries: AsyncZippable = {
    [ZIP_STATE_FILE_NAME]: strToU8(JSON.stringify(state, null, 2)),
  };
  for (const image of state.images) {
    entries[imagePath(image)] = new Uint8Array(imageBytesByDigest.get(image.digest)!);
  }
  return {
    blob: new Blob([await createZip(entries)], {type: 'application/zip'}),
    unavailableImageCount: unavailableImageDigests.size,
  };
}

export async function replaceStateFromZip(file: File): Promise<StoreChangeTokens> {
  const expectedTokens = await getStoreChangeTokens();
  const entries = await readZip(new Uint8Array(await file.arrayBuffer()));
  const stateFile = entries[ZIP_STATE_FILE_NAME];
  if (!stateFile) {
    throw new Error(`Backup file is missing: ${ZIP_STATE_FILE_NAME}`);
  }
  const state = parseCloudState(strFromU8(stateFile));
  if (!state) {
    throw new Error(`Backup file is invalid: ${ZIP_STATE_FILE_NAME}`);
  }
  const images = await validateImages(state, entries);
  return await withCloudLock(() => replaceLocalStateFromZip(state, images, expectedTokens));
}

export function getStateZipFilename() {
  const dateTime = dayjs().format('YYYYMMDD_HHmm');
  return `artistassistapp-backup-${dateTime}${FileExtension.State}`;
}
