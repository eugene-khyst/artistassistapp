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
import type {AsyncZippable, Unzipped} from 'fflate';
import {strFromU8, strToU8, unzip, zip} from 'fflate';

import {withCloudLock} from '@/services/cloud/cloud-lock';
import {createCloudState, parseCloudState} from '@/services/cloud/cloud-state';
import type {CloudImage, CloudState} from '@/services/cloud/types';
import {FileExtension} from '@/services/cloud/types';
import {getLocalStateWithImageFiles, replaceLocalStateFromZip} from '@/services/db/cloud-sync-db';
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

export async function createStateZip(): Promise<Blob> {
  const {customBrands, colorSets, images, imageFiles, colorMixtures} = await withCloudLock(() =>
    getLocalStateWithImageFiles()
  );
  const state = createCloudState({
    customBrands,
    colorSets,
    images,
    colorMixtures,
  });
  const entries: AsyncZippable = {
    [ZIP_STATE_FILE_NAME]: strToU8(JSON.stringify(state, null, 2)),
  };
  const imageFilesByDigest = new Map(imageFiles.map(image => [image.digest, image]));
  for (const image of state.images) {
    const imageFile = imageFilesByDigest.get(image.digest)!;
    entries[imagePath(image)] = new Uint8Array(await imageFile.blob.arrayBuffer());
  }
  return new Blob([await createZip(entries)], {type: 'application/zip'});
}

export async function replaceStateFromZip(file: File): Promise<StoreChangeTokens> {
  const expectedTokens = await getStoreChangeTokens();
  const entries = await readZip(new Uint8Array(await file.arrayBuffer()));
  const stateFile = entries[ZIP_STATE_FILE_NAME];
  const state = stateFile ? parseCloudState(strFromU8(stateFile)) : undefined;
  if (!state) {
    throw new Error(`Backup file is missing or invalid: ${ZIP_STATE_FILE_NAME}`);
  }
  const images = await validateImages(state, entries);
  return await withCloudLock(() => replaceLocalStateFromZip(state, images, expectedTokens));
}

export function getStateZipFilename() {
  const dateTime = dayjs().format('YYYYMMDD_HHmm');
  return `artistassistapp-backup-${dateTime}${FileExtension.State}`;
}
