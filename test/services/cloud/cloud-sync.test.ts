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

import {afterAll, beforeEach, describe, expect, it, vi} from 'vitest';

import type {CloudClient, CloudFile, CloudFolder} from '@/services/cloud/cloud-client';
import {CloudItemKind, CloudItemPurpose} from '@/services/cloud/cloud-client';
import {
  createCloudState,
  parseCloudState,
  serializeAndHashCloudState,
  serializeCloudState,
  STATE_FILE_NAME,
} from '@/services/cloud/cloud-state';
import {
  downloadCloudState,
  pushCloudState,
  repairCloudImage,
  syncCloudState,
  uploadCloudState,
} from '@/services/cloud/cloud-sync-client';
import {CloudError, CloudErrorType} from '@/services/cloud/errors';
import type {CloudState} from '@/services/cloud/types';
import {CloudProvider, CloudSyncType} from '@/services/cloud/types';
import {saveCloudConnection} from '@/services/db/cloud-connection-db';
import {
  getCloudSync,
  getLocalState,
  getLocalStateConnection,
  saveCloudSync,
} from '@/services/db/cloud-sync-db';
import {dbPromise, deleteDatabase} from '@/services/db/db';
import {
  deleteImageFileAndColorMixturesByDigest,
  readImageBytes,
  saveNewImageFiles,
  saveRepairedImageBytes,
} from '@/services/db/image-file-db';
import type {StoreName} from '@/services/db/schema';
import {ImageUnreadableError} from '@/services/image/errors';
import type {ImageFile} from '@/services/image/image-file';
import {toImageMetadata} from '@/services/image/image-file';
import {digestArrayBuffer} from '@/utils/digest';

type RemoteData = Record<string, never>;

const USER = {id: 'user'};

const cloudClient = vi.hoisted(() => ({
  findAppRoot: vi.fn<CloudClient<RemoteData>['findAppRoot']>(),
  createAppRoot: vi.fn<CloudClient<RemoteData>['createAppRoot']>(),
  findFolder: vi.fn<CloudClient<RemoteData>['findFolder']>(),
  findFile: vi.fn<CloudClient<RemoteData>['findFile']>(),
  listFiles: vi.fn<CloudClient<RemoteData>['listFiles']>(),
  createFolder: vi.fn<CloudClient<RemoteData>['createFolder']>(),
  uploadFile: vi.fn<CloudClient<RemoteData>['uploadFile']>(),
  downloadFile: vi.fn<CloudClient<RemoteData>['downloadFile']>(),
  deleteItem: vi.fn<CloudClient<RemoteData>['deleteItem']>(),
  deleteAppData: vi.fn<CloudClient<RemoteData>['deleteAppData']>(),
}));

vi.mock('@/services/cloud/google-drive-client', () => ({
  GoogleDriveClient: function GoogleDriveClient() {
    return cloudClient;
  },
}));

vi.mock('@/services/cloud/microsoft-one-drive-client', () => ({
  MicrosoftOneDriveClient: function MicrosoftOneDriveClient() {
    return cloudClient;
  },
}));

vi.mock('@/services/cloud/dropbox-client', () => ({
  DropboxClient: function DropboxClient() {
    return cloudClient;
  },
}));

vi.mock('@/services/cloud/cloud-connection-client', () => ({
  disconnectCloudConnection: vi.fn(),
}));

function bytes(value: string): ArrayBuffer {
  return new TextEncoder().encode(value).buffer;
}

function deferred<T>(): {promise: Promise<T>; resolve: (value: T) => void} {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(promiseResolve => {
    resolve = promiseResolve;
  });
  return {promise, resolve};
}

async function imageFile(value: string): Promise<{bytes: ArrayBuffer; image: ImageFile}> {
  const content = bytes(value);
  return {
    bytes: content,
    image: {
      digest: await digestArrayBuffer(content),
      blob: new Blob([content], {type: 'image/png'}),
      type: 'image/png',
      name: 'photo.png',
      date: new Date('2026-01-01T00:00:00.000Z'),
    },
  };
}

function folder(id: string, name: string): CloudFolder<RemoteData> {
  return {id, name, kind: CloudItemKind.Folder, data: {}};
}

function file(
  id: string,
  name: string,
  modifiedAt: string,
  contentDigest?: string
): CloudFile<RemoteData> {
  return {
    id,
    name,
    kind: CloudItemKind.File,
    ...(contentDigest ? {contentDigest} : {}),
    revision: id,
    modifiedAt: new Date(modifiedAt),
    data: {},
  };
}

function cloudState(images: ImageFile[] = []): CloudState {
  return createCloudState({
    customBrands: [],
    colorSets: [],
    images: images.map(toImageMetadata),
    colorMixtures: [],
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

beforeEach(async () => {
  vi.resetAllMocks();
  await resetAppDatabase();
  await saveCloudConnection(
    {id: 'connection', provider: CloudProvider.Google},
    {markStoreChanges: false}
  );
});

afterAll(async () => {
  const db = await dbPromise;
  db.close();
  await deleteDatabase();
});

describe('repairCloudImage', () => {
  it('tries matching cloud files newest-first until one passes full digest validation', async () => {
    const local = await imageFile('healthy cloud bytes');
    await saveNewImageFiles([local.image]);
    const db = await dbPromise;
    await db.put('image-blobs', {
      digest: local.image.digest,
      blob: new Blob([bytes('damaged local bytes')], {type: local.image.type}),
    });
    const root = folder('root', 'ArtistAssistApp');
    const photos = folder('photos', 'Photos');
    const older = file('older', 'older.png', '2026-01-01T00:00:00.000Z', local.image.digest);
    const newest = file('newest', 'newest.png', '2026-02-01T00:00:00.000Z', local.image.digest);
    cloudClient.findAppRoot.mockResolvedValue(root);
    cloudClient.findFolder.mockResolvedValue(photos);
    cloudClient.listFiles.mockResolvedValue([older, newest]);
    cloudClient.downloadFile.mockImplementation(file =>
      Promise.resolve(file.id === newest.id ? bytes('damaged cloud bytes') : local.bytes)
    );

    const result = await repairCloudImage(local.image.digest);

    expect(result.status).toBe('restored');
    expect(cloudClient.downloadFile.mock.calls.map(([candidate]) => candidate.id)).toEqual([
      newest.id,
      older.id,
    ]);
    expect(new Uint8Array(await readImageBytes(local.image))).toEqual(new Uint8Array(local.bytes));
    expect(cloudClient.createAppRoot).not.toHaveBeenCalled();
    expect(cloudClient.createFolder).not.toHaveBeenCalled();
  });

  it('reports an unavailable copy without creating cloud folders', async () => {
    const local = await imageFile('missing cloud photo');
    await saveNewImageFiles([local.image]);
    cloudClient.findAppRoot.mockResolvedValue(null);

    await expect(repairCloudImage(local.image.digest)).resolves.toEqual({status: 'unavailable'});
    expect(cloudClient.createAppRoot).not.toHaveBeenCalled();
    expect(cloudClient.createFolder).not.toHaveBeenCalled();
    expect(cloudClient.downloadFile).not.toHaveBeenCalled();
  });

  it.each([CloudProvider.Microsoft, CloudProvider.Dropbox])(
    'restores a %s photo whose digest is encoded in its filename',
    async provider => {
      await saveCloudConnection({id: 'connection', provider}, {markStoreChanges: false});
      const local = await imageFile(`${provider} cloud bytes`);
      await saveNewImageFiles([local.image]);
      const db = await dbPromise;
      await db.put('image-blobs', {
        digest: local.image.digest,
        blob: new Blob([bytes('damaged local bytes')], {type: local.image.type}),
      });
      const root = folder('root', 'ArtistAssistApp');
      const photos = folder('photos', 'Photos');
      const remotePhoto = file('photo', `${local.image.digest}.png`, '2026-02-01T00:00:00.000Z');
      cloudClient.findAppRoot.mockResolvedValue(root);
      cloudClient.findFolder.mockResolvedValue(photos);
      cloudClient.listFiles.mockResolvedValue([remotePhoto]);
      cloudClient.downloadFile.mockResolvedValue(local.bytes);

      const result = await repairCloudImage(local.image.digest);

      expect(result.status).toBe('restored');
      expect(new Uint8Array(await readImageBytes(local.image))).toEqual(
        new Uint8Array(local.bytes)
      );
    }
  );

  it('does not resurrect a photo deleted while its cloud copy is downloading', async () => {
    const local = await imageFile('deleted during repair');
    await saveNewImageFiles([local.image]);
    const root = folder('root', 'ArtistAssistApp');
    const photos = folder('photos', 'Photos');
    const remotePhoto = file('photo', 'photo.png', '2026-02-01T00:00:00.000Z', local.image.digest);
    cloudClient.findAppRoot.mockResolvedValue(root);
    cloudClient.findFolder.mockResolvedValue(photos);
    cloudClient.listFiles.mockResolvedValue([remotePhoto]);
    cloudClient.downloadFile.mockImplementation(async () => {
      await deleteImageFileAndColorMixturesByDigest(local.image.digest);
      return local.bytes;
    });

    await expect(repairCloudImage(local.image.digest)).resolves.toEqual({status: 'deleted'});
    const db = await dbPromise;
    expect(await db.get('image-metadata', local.image.digest)).toBeUndefined();
    expect(await db.get('image-blobs', local.image.digest)).toBeUndefined();
  });
});

describe('cloud sync', () => {
  it('uploads photos before committing the state file', async () => {
    const local = await imageFile('local photo');
    await saveNewImageFiles([local.image]);
    const root = folder('root', 'ArtistAssistApp');
    const photos = folder('photos', 'Photos');
    const remotePhoto = file('photo', 'photo.png', '2026-02-01T00:00:00.000Z', local.image.digest);
    const remoteStateFile = file('state', STATE_FILE_NAME, '2026-02-01T00:00:00.000Z');
    cloudClient.findAppRoot.mockResolvedValue(null);
    cloudClient.createAppRoot.mockResolvedValue(root);
    cloudClient.findFolder.mockResolvedValue(null);
    cloudClient.createFolder.mockResolvedValue(photos);
    const photoUpload = deferred<CloudFile<RemoteData>>();
    cloudClient.uploadFile.mockImplementation(request =>
      request.purpose === CloudItemPurpose.Image
        ? photoUpload.promise
        : Promise.resolve(remoteStateFile)
    );

    const sync = syncCloudState(USER);
    try {
      await vi.waitFor(() => {
        expect(cloudClient.uploadFile).toHaveBeenCalledTimes(1);
      });
    } finally {
      photoUpload.resolve(remotePhoto);
    }
    const result = await sync;

    expect(result?.type).toBe(CloudSyncType.Upload);
    expect(cloudClient.uploadFile).toHaveBeenCalledTimes(2);
    const imageUpload = cloudClient.uploadFile.mock.calls[0]![0];
    const stateUpload = cloudClient.uploadFile.mock.calls[1]![0];
    expect(imageUpload.purpose).toBe(CloudItemPurpose.Image);
    expect(new Uint8Array(await imageUpload.blob.arrayBuffer())).toEqual(
      new Uint8Array(local.bytes)
    );
    expect(stateUpload.purpose).toBe(CloudItemPurpose.SyncState);
    expect(parseCloudState(await stateUpload.blob.text())?.images).toEqual(
      cloudState([local.image]).images
    );
    expect((await getCloudSync('connection'))?.lastSyncedRev).toBe(remoteStateFile.revision);
    expect(await getLocalStateConnection()).toMatchObject({
      connectionId: 'connection',
      userId: USER.id,
    });
  });

  it('does not commit cloud state when a local photo is unreadable', async () => {
    const local = await imageFile('unreadable upload');
    await saveNewImageFiles([local.image]);
    const db = await dbPromise;
    await db.put('image-blobs', {
      digest: local.image.digest,
      blob: new Blob([bytes('damaged local bytes')], {type: local.image.type}),
    });
    const root = folder('root', 'ArtistAssistApp');
    const photos = folder('photos', 'Photos');
    cloudClient.findAppRoot.mockResolvedValue(null);
    cloudClient.createAppRoot.mockResolvedValue(root);
    cloudClient.findFolder.mockResolvedValue(null);
    cloudClient.createFolder.mockResolvedValue(photos);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    let error: unknown;
    try {
      error = await syncCloudState(USER).then(
        () => undefined,
        reason => reason
      );
    } finally {
      errorSpy.mockRestore();
    }

    expect(error).toBeInstanceOf(ImageUnreadableError);
    expect(CloudError.fromError(error)).toMatchObject({
      type: CloudErrorType.LocalImageUnreadable,
      cause: error,
    });
    expect(cloudClient.uploadFile).not.toHaveBeenCalled();
    expect(await getCloudSync('connection')).toBeUndefined();
  });

  it('downloads a verified cloud copy when local metadata has damaged bytes', async () => {
    const remote = await imageFile('remote photo');
    await saveNewImageFiles([remote.image]);
    const db = await dbPromise;
    await db.put('image-blobs', {
      digest: remote.image.digest,
      blob: new Blob([bytes('damaged local bytes')], {type: remote.image.type}),
    });
    const root = folder('root', 'ArtistAssistApp');
    const photos = folder('photos', 'Photos');
    const remoteStateFile = file('state', STATE_FILE_NAME, '2026-02-01T00:00:00.000Z');
    const remotePhoto = file('photo', 'photo.png', '2026-02-01T00:00:00.000Z', remote.image.digest);
    cloudClient.findAppRoot.mockResolvedValue(root);
    cloudClient.findFile.mockResolvedValue(remoteStateFile);
    cloudClient.findFolder.mockResolvedValue(photos);
    cloudClient.listFiles.mockResolvedValue([remotePhoto]);
    cloudClient.downloadFile.mockImplementation(candidate =>
      Promise.resolve(
        candidate.id === remoteStateFile.id
          ? bytes(serializeCloudState(cloudState([remote.image])))
          : remote.bytes
      )
    );

    const result = await downloadCloudState(USER);

    expect(result?.type).toBe(CloudSyncType.Download);
    expect(new Uint8Array(await readImageBytes(remote.image))).toEqual(
      new Uint8Array(remote.bytes)
    );
    expect(await getLocalStateConnection()).toMatchObject({
      connectionId: 'connection',
      userId: USER.id,
    });
  });

  it('does not download a healthy local photo and preserves its bytes', async () => {
    const local = await imageFile('healthy local photo');
    await saveNewImageFiles([local.image]);
    const db = await dbPromise;
    const blobBefore = await db.get('image-blobs', local.image.digest);
    const root = folder('root', 'ArtistAssistApp');
    const remoteStateFile = file('state', STATE_FILE_NAME, '2026-02-01T00:00:00.000Z');
    cloudClient.findAppRoot.mockResolvedValue(root);
    cloudClient.findFile.mockResolvedValue(remoteStateFile);
    cloudClient.downloadFile.mockResolvedValue(
      bytes(serializeCloudState(cloudState([local.image])))
    );

    const result = await downloadCloudState(USER);

    expect(result?.type).toBe(CloudSyncType.Download);
    expect(cloudClient.downloadFile).toHaveBeenCalledTimes(1);
    expect(cloudClient.findFolder).not.toHaveBeenCalled();
    expect(await (await db.get('image-blobs', local.image.digest))?.blob.text()).toBe(
      await blobBefore?.blob.text()
    );
  });

  it('preserves local state when a synchronized cloud photo is missing', async () => {
    const local = await imageFile('existing local state');
    const remote = await imageFile('missing remote photo');
    await saveNewImageFiles([local.image]);
    const localStateBefore = createCloudState(await getLocalState());
    const root = folder('root', 'ArtistAssistApp');
    const photos = folder('photos', 'Photos');
    const remoteStateFile = file('state', STATE_FILE_NAME, '2026-02-01T00:00:00.000Z');
    cloudClient.findAppRoot.mockResolvedValue(root);
    cloudClient.findFile.mockResolvedValue(remoteStateFile);
    cloudClient.findFolder.mockResolvedValue(photos);
    cloudClient.listFiles.mockResolvedValue([]);
    cloudClient.downloadFile.mockResolvedValue(
      bytes(serializeCloudState(cloudState([remote.image])))
    );
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      await expect(downloadCloudState(USER)).rejects.toMatchObject({
        type: CloudErrorType.CloudDataNotFound,
      });
    } finally {
      errorSpy.mockRestore();
    }

    expect(createCloudState(await getLocalState())).toEqual(localStateBefore);
    expect(new Uint8Array(await readImageBytes(local.image))).toEqual(new Uint8Array(local.bytes));
    expect(await getLocalStateConnection()).toBeUndefined();
  });

  it('preserves local state when a cloud photo fails digest validation', async () => {
    const local = await imageFile('existing local state');
    const remote = await imageFile('expected remote photo');
    await saveNewImageFiles([local.image]);
    const localStateBefore = createCloudState(await getLocalState());
    const root = folder('root', 'ArtistAssistApp');
    const photos = folder('photos', 'Photos');
    const remoteStateFile = file('state', STATE_FILE_NAME, '2026-02-01T00:00:00.000Z');
    const remotePhoto = file('photo', 'photo.png', '2026-02-01T00:00:00.000Z', remote.image.digest);
    cloudClient.findAppRoot.mockResolvedValue(root);
    cloudClient.findFile.mockResolvedValue(remoteStateFile);
    cloudClient.findFolder.mockResolvedValue(photos);
    cloudClient.listFiles.mockResolvedValue([remotePhoto]);
    cloudClient.downloadFile.mockImplementation(candidate =>
      Promise.resolve(
        candidate.id === remoteStateFile.id
          ? bytes(serializeCloudState(cloudState([remote.image])))
          : bytes('damaged remote bytes')
      )
    );
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      await expect(downloadCloudState(USER)).rejects.toThrow(
        `Cloud image digest mismatch: ${remote.image.digest}`
      );
    } finally {
      errorSpy.mockRestore();
    }

    expect(createCloudState(await getLocalState())).toEqual(localStateBefore);
    expect(new Uint8Array(await readImageBytes(local.image))).toEqual(new Uint8Array(local.bytes));
    expect(await getLocalStateConnection()).toBeUndefined();
  });

  it('does not push after a byte-only repair leaves the state hash unchanged', async () => {
    const local = await imageFile('repaired photo');
    await saveNewImageFiles([local.image]);
    const {hash} = await serializeAndHashCloudState(cloudState([local.image]));
    await saveCloudSync(
      {
        connectionId: 'connection',
        lastSyncedRev: 'revision',
        remoteItems: {rootFolderId: 'root', stateFileId: 'state'},
      },
      {connectionId: 'connection', stateHash: hash, userId: USER.id}
    );
    const db = await dbPromise;
    await db.put('image-blobs', {
      digest: local.image.digest,
      blob: new Blob([bytes('damaged local bytes')], {type: local.image.type}),
    });
    await saveRepairedImageBytes(local.image.digest, local.bytes);

    const result = await pushCloudState(USER);

    expect(result?.type).toBe(CloudSyncType.Unchanged);
    expect(cloudClient.findAppRoot).not.toHaveBeenCalled();
    expect(cloudClient.uploadFile).not.toHaveBeenCalled();
  });

  it('accepts a new provider revision when the remote content is unchanged', async () => {
    const state = cloudState();
    const {hash} = await serializeAndHashCloudState(state);
    await saveCloudSync(
      {
        connectionId: 'connection',
        lastSyncedRev: 'old-revision',
        remoteItems: {rootFolderId: 'root', stateFileId: 'state'},
      },
      {connectionId: 'connection', stateHash: hash, userId: USER.id}
    );
    const root = folder('root', 'ArtistAssistApp');
    const remoteStateFile = file('new-revision', STATE_FILE_NAME, '2026-02-01T00:00:00.000Z');
    cloudClient.findAppRoot.mockResolvedValue(root);
    cloudClient.findFile.mockResolvedValue(remoteStateFile);
    cloudClient.downloadFile.mockResolvedValue(bytes(serializeCloudState(state)));

    const result = await syncCloudState(USER);

    expect(result?.type).toBe(CloudSyncType.Unchanged);
    expect((await getCloudSync('connection'))?.lastSyncedRev).toBe(remoteStateFile.revision);
    expect(cloudClient.uploadFile).not.toHaveBeenCalled();
    expect(cloudClient.findFolder).not.toHaveBeenCalled();
  });

  it('requires explicit upload to recreate a synchronized photo deleted remotely', async () => {
    const local = await imageFile('local changed photo');
    local.image.name = 'renamed.png';
    await saveNewImageFiles([local.image]);
    const remoteState = cloudState([local.image]);
    remoteState.images[0] = {...remoteState.images[0]!, name: 'original.png'};
    const {hash: remoteHash} = await serializeAndHashCloudState(remoteState);
    await saveCloudSync(
      {
        connectionId: 'connection',
        lastSyncedRev: 'remote-revision',
        remoteItems: {rootFolderId: 'root', stateFileId: 'state'},
      },
      {connectionId: 'connection', stateHash: remoteHash, userId: USER.id}
    );
    const root = folder('root', 'ArtistAssistApp');
    const photos = folder('photos', 'Photos');
    const remoteStateFile = file('remote-revision', STATE_FILE_NAME, '2026-02-01T00:00:00.000Z');
    const uploadedPhoto = file(
      'uploaded-photo',
      'photo.png',
      '2026-02-01T00:00:00.000Z',
      local.image.digest
    );
    cloudClient.findAppRoot.mockResolvedValue(root);
    cloudClient.findFile.mockResolvedValue(remoteStateFile);
    cloudClient.findFolder.mockResolvedValue(photos);
    cloudClient.listFiles.mockResolvedValue([]);
    cloudClient.downloadFile.mockResolvedValue(bytes(serializeCloudState(remoteState)));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      await expect(syncCloudState(USER)).rejects.toMatchObject({
        type: CloudErrorType.CloudDataNotFound,
      });
    } finally {
      errorSpy.mockRestore();
    }
    expect(cloudClient.uploadFile).not.toHaveBeenCalled();

    cloudClient.uploadFile.mockImplementation(request =>
      Promise.resolve(request.purpose === CloudItemPurpose.Image ? uploadedPhoto : remoteStateFile)
    );

    const result = await uploadCloudState(USER);

    expect(result?.type).toBe(CloudSyncType.Upload);
    expect(cloudClient.uploadFile.mock.calls.map(([request]) => request.purpose)).toEqual([
      CloudItemPurpose.Image,
      CloudItemPurpose.SyncState,
    ]);
  });

  it('rejects concurrent local and remote changes without replacing either side', async () => {
    const baseline = cloudState();
    const {hash: baselineHash} = await serializeAndHashCloudState(baseline);
    await saveCloudSync(
      {
        connectionId: 'connection',
        lastSyncedRev: 'old-revision',
        remoteItems: {rootFolderId: 'root', stateFileId: 'state'},
      },
      {connectionId: 'connection', stateHash: baselineHash, userId: USER.id}
    );
    const local = await imageFile('local change');
    const remote = await imageFile('remote change');
    await saveNewImageFiles([local.image]);
    const root = folder('root', 'ArtistAssistApp');
    const remoteStateFile = file('new-revision', STATE_FILE_NAME, '2026-02-01T00:00:00.000Z');
    cloudClient.findAppRoot.mockResolvedValue(root);
    cloudClient.findFile.mockResolvedValue(remoteStateFile);
    cloudClient.downloadFile.mockResolvedValue(
      bytes(serializeCloudState(cloudState([remote.image])))
    );
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      await expect(syncCloudState(USER)).rejects.toMatchObject({
        type: CloudErrorType.SyncConflict,
      });
    } finally {
      errorSpy.mockRestore();
    }

    expect(new Uint8Array(await readImageBytes(local.image))).toEqual(new Uint8Array(local.bytes));
    expect(cloudClient.uploadFile).not.toHaveBeenCalled();
    expect(cloudClient.findFolder).not.toHaveBeenCalled();
  });
});
