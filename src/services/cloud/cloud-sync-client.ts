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

import type {User} from '@/services/auth/types';
import {
  type CloudClient,
  type CloudFile,
  type CloudFolder,
  CloudItemPurpose,
} from '@/services/cloud/cloud-client';
import {disconnectCloudConnection} from '@/services/cloud/cloud-connection-client';
import {withCloudLock} from '@/services/cloud/cloud-lock';
import {
  createCloudState,
  parseCloudState,
  serializeAndHashCloudState,
  STATE_FILE_NAME,
} from '@/services/cloud/cloud-state';
import {DropboxClient} from '@/services/cloud/dropbox-client';
import {CloudError, CloudErrorType} from '@/services/cloud/errors';
import {GoogleDriveClient} from '@/services/cloud/google-drive-client';
import {MicrosoftOneDriveClient} from '@/services/cloud/microsoft-one-drive-client';
import {
  type CloudConnection,
  type CloudImage,
  CloudProvider,
  type CloudRemoteItems,
  type CloudState,
  type CloudSync,
  type CloudSyncClient,
  type CloudSyncContext,
  type CloudSyncOptions,
  type CloudSyncResult,
  CloudSyncType,
  EMPTY_CLOUD_STATE,
  type LocalStateConnection,
} from '@/services/cloud/types';
import {getCloudConnection} from '@/services/db/cloud-connection-db';
import {
  getCloudSync,
  getLocalState,
  getLocalStateConnection,
  replaceLocalStateFromCloud,
  saveCloudSync,
} from '@/services/db/cloud-sync-db';
import {
  getReadableImageDigests,
  readImageBytes,
  type RepairedImage,
  saveRepairedImageBytes,
} from '@/services/db/image-file-db';
import type {StoreChangeTokens} from '@/services/db/types';
import type {ImageFile} from '@/services/image/image-file';
import {digestArrayBuffer} from '@/utils/digest';
import {addExtensionIfMissing, getFilename} from '@/utils/filename';
import {getExtensionForMimeType} from '@/utils/mime';

const IMAGES_FOLDER_NAME = 'Photos';

const textDecoder = new TextDecoder();

function hash8(hash: string | null | undefined): string {
  return hash ? hash.slice(0, 8) : 'none';
}

type RemoteSyncStateFile<T> =
  | {
      exists: false;
      rootFolder: CloudFolder<T> | null;
      syncStateFile: null;
    }
  | {
      exists: true;
      rootFolder: CloudFolder<T>;
      syncStateFile: CloudFile<T>;
      revision: string;
    };

type DownloadedSyncState =
  | {
      exists: false;
    }
  | {
      exists: true;
      revision: string;
      state: CloudState;
      hash: string;
    };

type RemoteImageDownload<T> =
  | {status: 'verified'; file: CloudFile<T>; bytes: ArrayBuffer}
  | {status: 'missing'}
  | {status: 'invalid'};

export type CloudImageRepairResult =
  {status: 'deleted'} | {status: 'restored'; image: RepairedImage} | {status: 'unavailable'};

function createCloudSyncClient<T>(
  provider: CloudProvider,
  client: CloudClient<T>
): CloudSyncClient {
  return {
    sync: context => syncState(client, context),
    push: context => pushState(client, context),
    upload: context => uploadState(client, context),
    download: context => downloadState(client, context),
    repairImage: (digest, cloudSync) => repairImage(client, provider, digest, cloudSync),
    hasCloudDataChanged: (cloudSync, localStateConnection) =>
      checkCloudDataChanged(client, cloudSync, localStateConnection),
    deleteCloudData: (cloudSync, permanent) => deleteCloudData(client, cloudSync, permanent),
  };
}

async function syncState<T>(
  client: CloudClient<T>,
  context: CloudSyncContext
): Promise<CloudSyncResult> {
  const remote = await resolveRemoteSyncStateFile(client, context.connectionCloudSync?.remoteItems);
  const remoteChange = await resolveRemoteChange(client, context, remote);
  const type = getSyncAction(context, remote, remoteChange.changed);
  switch (type) {
    case CloudSyncType.Download:
      return await downloadState(client, context, remote, remoteChange.remoteState);
    case CloudSyncType.Upload:
      return await uploadState(client, context, remote, remoteChange.remoteState);
    case CloudSyncType.Unchanged:
      return unchangedResult(context, remote, remoteChange);
  }
}

async function pushState<T>(
  client: CloudClient<T>,
  context: CloudSyncContext
): Promise<CloudSyncResult> {
  const {connectionCloudSync, localStateConnection, localStateHash} = context;
  if (connectionCloudSync && localStateConnection?.stateHash === localStateHash) {
    console.log('[cloud-sync] push skipped: no local changes');
    return {
      type: CloudSyncType.Unchanged,
    };
  }

  const remote = await resolveRemoteSyncStateFile(client, connectionCloudSync?.remoteItems);
  const remoteChange = await resolveRemoteChange(client, context, remote);
  if (getSyncAction(context, remote, remoteChange.changed) === CloudSyncType.Upload) {
    return await uploadState(client, context, remote, remoteChange.remoteState);
  }
  return unchangedResult(context, remote, remoteChange);
}

async function uploadState<T>(
  client: CloudClient<T>,
  {
    cloudConnection,
    connectionCloudSync,
    localState,
    localStateHash,
    localStateJson,
    recreateDeletedRemoteItems,
    signal,
    onProgress,
  }: CloudSyncContext,
  remote?: RemoteSyncStateFile<T>,
  downloadedState?: DownloadedSyncState
): Promise<CloudSyncResult> {
  const remoteInfo =
    remote ?? (await resolveRemoteSyncStateFile(client, connectionCloudSync?.remoteItems));
  const {syncStateFile, rootFolder} = await uploadCloudData(
    client,
    cloudConnection.provider,
    localStateJson,
    localState.images,
    remoteInfo,
    downloadedState,
    {signal, onProgress},
    recreateDeletedRemoteItems
  );
  return {
    type: CloudSyncType.Upload,
    cloudSync: {
      connectionId: cloudConnection.id,
      lastSyncedRev: syncStateFile.revision,
      remoteItems: {rootFolderId: rootFolder.id, stateFileId: syncStateFile.id},
    },
    stateHash: localStateHash,
  };
}

async function downloadState<T>(
  client: CloudClient<T>,
  {cloudConnection, connectionCloudSync, signal, onProgress}: CloudSyncContext,
  remote?: RemoteSyncStateFile<T>,
  downloadedState?: DownloadedSyncState
): Promise<CloudSyncResult> {
  const remoteInfo =
    remote ?? (await resolveRemoteSyncStateFile(client, connectionCloudSync?.remoteItems));
  const remoteState = downloadedState ?? (await downloadRemoteSyncState(client, remoteInfo));
  if (!remoteInfo.exists || !remoteState.exists) {
    throw new CloudError(CloudErrorType.CloudDataNotFound, 'Cloud data not found');
  }
  const downloadedImages = await downloadImages(
    client,
    cloudConnection.provider,
    remoteState.state.images,
    remoteInfo.rootFolder,
    {signal, onProgress}
  );
  // Last cancel check: past this point the downloaded state replaces the local state.
  signal?.throwIfAborted();
  console.log(
    `[cloud-sync] cloud data downloaded: revision ${remoteState.revision}, ` +
      `${downloadedImages.length} images`
  );
  return {
    type: CloudSyncType.Download,
    cloudSync: {
      connectionId: cloudConnection.id,
      lastSyncedRev: remoteState.revision,
      remoteItems: remoteItemsOf(remoteInfo),
    },
    stateHash: remoteState.hash,
    remoteState: remoteState.state,
    remoteImages: downloadedImages,
  };
}

async function checkCloudDataChanged<T>(
  client: CloudClient<T>,
  cloudSync: CloudSync,
  localStateConnection: LocalStateConnection
): Promise<boolean> {
  const remote = await resolveRemoteSyncStateFile(client, cloudSync.remoteItems);
  if (!remote.exists) {
    console.log('[cloud-sync] cloud data check: no remote data');
    throw new CloudError(CloudErrorType.CloudDataNotFound, 'Cloud data not found');
  }
  if (cloudSync.lastSyncedRev && remote.revision === cloudSync.lastSyncedRev) {
    console.log('[cloud-sync] cloud data check: no changes');
    return false;
  }
  // Provider revisions churn without content changes, so only the content hash is trusted.
  const remoteState = await downloadRemoteSyncState(client, remote);
  const changed = !remoteState.exists || remoteState.hash !== localStateConnection.stateHash;
  console.log(
    `[cloud-sync] cloud data check: revision changed, ` +
      `content ${changed ? 'differs' : 'is the same, keeping new revision'}`
  );
  if (!changed) {
    await saveCloudSync(
      {...cloudSync, lastSyncedRev: remote.revision, remoteItems: remoteItemsOf(remote)},
      localStateConnection
    );
  }
  return changed;
}

async function deleteCloudData<T>(
  client: CloudClient<T>,
  cloudSync?: CloudSync,
  permanent = false
): Promise<void> {
  await client.deleteAppData(cloudSync?.remoteItems.rootFolderId, permanent);
}

function isForeignUser({localStateConnection, userId}: CloudSyncContext): boolean {
  return !!localStateConnection && localStateConnection.userId !== userId;
}

function remoteItemsOf<T>(remote: RemoteSyncStateFile<T> & {exists: true}): CloudRemoteItems {
  return {rootFolderId: remote.rootFolder.id, stateFileId: remote.syncStateFile.id};
}

interface RemoteChange {
  changed: boolean;
  remoteState?: DownloadedSyncState;
}

async function resolveRemoteChange<T>(
  client: CloudClient<T>,
  {connectionCloudSync, localStateConnection}: CloudSyncContext,
  remote: RemoteSyncStateFile<T>
): Promise<RemoteChange> {
  if (!connectionCloudSync || !remote.exists) {
    return {changed: false};
  }
  if (connectionCloudSync.lastSyncedRev && remote.revision === connectionCloudSync.lastSyncedRev) {
    return {changed: false};
  }
  // Provider revisions churn without content changes, so only the content hash is trusted.
  const remoteState = await downloadRemoteSyncState(client, remote);
  if (!remoteState.exists) {
    return {changed: true};
  }
  const changed = remoteState.hash !== localStateConnection?.stateHash;
  console.log(
    `[cloud-sync] remote revision changed, content ${changed ? 'differs' : 'is the same'} ` +
      `(${hash8(remoteState.hash)} vs ${hash8(localStateConnection?.stateHash)})`
  );
  return {changed, remoteState};
}

function unchangedResult<T>(
  {connectionCloudSync}: CloudSyncContext,
  remote: RemoteSyncStateFile<T>,
  remoteChange: RemoteChange
): CloudSyncResult {
  if (
    connectionCloudSync &&
    remote.exists &&
    !remoteChange.changed &&
    remote.revision !== connectionCloudSync.lastSyncedRev
  ) {
    console.log(`[cloud-sync] content is the same, keeping new revision ${remote.revision}`);
    return {
      type: CloudSyncType.Unchanged,
      cloudSync: {
        ...connectionCloudSync,
        lastSyncedRev: remote.revision,
        remoteItems: remoteItemsOf(remote),
      },
    };
  }
  return {
    type: CloudSyncType.Unchanged,
  };
}

function getSyncAction<T>(
  context: CloudSyncContext,
  remote: RemoteSyncStateFile<T>,
  remoteChangedSinceLastSync: boolean
): CloudSyncType {
  const {connectionCloudSync, localStateHash, localStateIsEmpty} = context;
  console.log(
    `[cloud-sync] remote revision ${remote.exists ? remote.revision : 'missing'} ` +
      `(was ${connectionCloudSync?.lastSyncedRev ?? 'none'}), ` +
      `local hash ${hash8(localStateHash)} (was ${hash8(context.localStateConnection?.stateHash)})` +
      (remoteChangedSinceLastSync ? ', remote changed' : '') +
      (localStateIsEmpty ? ', local state is empty' : '') +
      (isForeignUser(context) ? ', local data belongs to another user' : '')
  );
  if (isForeignUser(context)) {
    if (!remote.exists) {
      throw new CloudError(CloudErrorType.CloudDataNotFound, 'Cloud data not found');
    }
    if (context.localStateConnection?.stateHash !== localStateHash) {
      throw new CloudError(CloudErrorType.OtherUserChanges, 'Other user has unsynced changes');
    }
    return CloudSyncType.Download;
  }

  if (!connectionCloudSync) {
    if (remote.exists && !localStateIsEmpty) {
      throw new CloudError(CloudErrorType.NoSyncHistory, 'Cloud sync history is missing');
    }
    return remote.exists ? CloudSyncType.Download : CloudSyncType.Upload;
  }

  if (!remote.exists) {
    throw new CloudError(CloudErrorType.CloudDataNotFound, 'Cloud data not found');
  }

  const localChangedSinceLastSync = context.localStateConnection?.stateHash !== localStateHash;

  if (localChangedSinceLastSync && remoteChangedSinceLastSync) {
    throw new CloudError(CloudErrorType.SyncConflict, 'Cloud sync conflict');
  }
  if (remoteChangedSinceLastSync) {
    return CloudSyncType.Download;
  }
  if (localChangedSinceLastSync) {
    return CloudSyncType.Upload;
  }
  return CloudSyncType.Unchanged;
}

async function resolveRemoteSyncStateFile<T>(
  client: CloudClient<T>,
  remoteItems?: CloudRemoteItems
): Promise<RemoteSyncStateFile<T>> {
  if (remoteItems && client.getFileById && client.getFolderById) {
    const [rootFolder, savedSyncStateFile] = await Promise.all([
      client.getFolderById(remoteItems.rootFolderId),
      client.getFileById(remoteItems.stateFileId, remoteItems.rootFolderId),
    ]);
    if (!rootFolder) {
      return {
        exists: false,
        rootFolder: null,
        syncStateFile: null,
      };
    }
    const syncStateFile =
      savedSyncStateFile ??
      (await client.findFile(rootFolder, STATE_FILE_NAME, CloudItemPurpose.SyncState));
    if (syncStateFile) {
      return {
        exists: true,
        rootFolder,
        syncStateFile,
        revision: syncStateFile.revision,
      };
    }
    console.log('[cloud-sync] cloud state file no longer exists');
    return {
      exists: false,
      rootFolder,
      syncStateFile: null,
    };
  }
  const rootFolder = await client.findAppRoot();
  if (!rootFolder) {
    return {
      exists: false,
      rootFolder: null,
      syncStateFile: null,
    };
  }
  const syncStateFile = await client.findFile(
    rootFolder,
    STATE_FILE_NAME,
    CloudItemPurpose.SyncState
  );
  return syncStateFile
    ? {
        exists: true,
        rootFolder,
        syncStateFile,
        revision: syncStateFile.revision,
      }
    : {
        exists: false,
        rootFolder,
        syncStateFile: null,
      };
}

// Repair never creates the root: a missing root means there is nothing to restore from.
async function resolveRootFolder<T>(
  client: CloudClient<T>,
  remoteItems?: CloudRemoteItems
): Promise<CloudFolder<T> | null> {
  if (remoteItems && client.getFolderById) {
    const rootFolder = await client.getFolderById(remoteItems.rootFolderId);
    if (rootFolder) {
      return rootFolder;
    }
  }
  return await client.findAppRoot();
}

async function uploadCloudData<T>(
  client: CloudClient<T>,
  provider: CloudProvider,
  cloudStateJson: string,
  cloudImages: CloudImage[],
  remote: RemoteSyncStateFile<T>,
  downloadedState: DownloadedSyncState | undefined,
  {signal, onProgress}: CloudSyncOptions,
  recreateDeletedRemoteItems: boolean
): Promise<{syncStateFile: CloudFile<T>; rootFolder: CloudFolder<T>}> {
  const rootFolder = remote.rootFolder ?? (await client.createAppRoot());
  const previousState =
    downloadedState ?? (remote.exists ? await downloadRemoteSyncState(client, remote) : undefined);
  const existingImagesFolder = await client.findFolder(
    rootFolder,
    IMAGES_FOLDER_NAME,
    CloudItemPurpose.ImagesFolder
  );
  const remoteImages = existingImagesFolder
    ? sortNewestFirst(await client.listFiles(existingImagesFolder, CloudItemPurpose.Image))
    : [];
  const remoteImageDigests = new Set(
    remoteImages
      .map(file => getRemoteImageDigest(provider, file))
      .filter((digest): digest is string => !!digest)
  );

  const cloudImageDigests = new Set(cloudImages.map(({digest}) => digest));
  const missingCloudImages = cloudImages.filter(({digest}) => !remoteImageDigests.has(digest));
  const previouslySyncedImageDigests = new Set(
    previousState?.exists ? previousState.state.images.map(({digest}) => digest) : []
  );
  const deletedRemoteImages = missingCloudImages.filter(({digest}) =>
    previouslySyncedImageDigests.has(digest)
  );
  if (deletedRemoteImages.length > 0 && !recreateDeletedRemoteItems) {
    throw new CloudError(
      CloudErrorType.CloudDataNotFound,
      'One or more synced photos were deleted from cloud storage'
    );
  }
  const imagesFolder =
    existingImagesFolder ??
    (await client.createFolder(rootFolder, IMAGES_FOLDER_NAME, CloudItemPurpose.ImagesFolder));
  for (const [i, cloudImage] of missingCloudImages.entries()) {
    signal?.throwIfAborted();
    onProgress?.({type: CloudSyncType.Upload, index: i + 1, count: missingCloudImages.length});
    const buffer = await readImageBytes(cloudImage);
    signal?.throwIfAborted();
    await client.uploadFile({
      parent: imagesFolder,
      name: cloudImageFileName(provider, cloudImage),
      blob: new Blob([buffer], {type: cloudImage.type}),
      purpose: CloudItemPurpose.Image,
      contentDigest: cloudImage.digest,
    });
  }
  const stateBlob = new Blob([cloudStateJson], {type: 'application/json'});

  // Last cancel check: once the state file is uploaded, the sync must finish.
  signal?.throwIfAborted();
  const syncStateFile = await client.uploadFile({
    parent: rootFolder,
    name: STATE_FILE_NAME,
    existing: remote.syncStateFile ?? undefined,
    purpose: CloudItemPurpose.SyncState,
    blob: stateBlob,
  });

  // Deduplicate by keeping the newest remote image for each digest.
  const keptImageDigests = new Set<string>();
  let deletedImages = 0;
  for (const remoteImage of remoteImages) {
    const digest = getRemoteImageDigest(provider, remoteImage);
    if (!digest) {
      continue;
    }
    if (!cloudImageDigests.has(digest) || keptImageDigests.has(digest)) {
      try {
        await client.deleteItem(remoteImage);
        deletedImages++;
      } catch (error) {
        console.warn(`[cloud-sync] could not delete obsolete cloud image ${remoteImage.id}`, error);
      }
      continue;
    }
    keptImageDigests.add(digest);
  }
  console.log(
    `[cloud-sync] cloud data uploaded: revision ${syncStateFile.revision}, ` +
      `${missingCloudImages.length} images uploaded, ${deletedImages} old images deleted`
  );

  return {syncStateFile, rootFolder};
}

async function downloadRemoteSyncState<T>(
  client: CloudClient<T>,
  remote: RemoteSyncStateFile<T>
): Promise<DownloadedSyncState> {
  if (!remote.exists) {
    return {
      exists: false,
    };
  }
  const buffer = await client.downloadFile(remote.syncStateFile);
  if (!buffer) {
    return {
      exists: false,
    };
  }
  const state = parseCloudState(textDecoder.decode(buffer));
  if (!state) {
    throw new CloudError(CloudErrorType.CorruptedCloudData, 'Cloud sync state file is corrupted');
  }
  const {hash} = await serializeAndHashCloudState(state);
  return {
    exists: true,
    hash,
    state,
    revision: remote.revision,
  };
}

async function downloadImages<T>(
  client: CloudClient<T>,
  provider: CloudProvider,
  cloudImages: CloudImage[],
  rootFolder: CloudFolder<T>,
  {signal, onProgress}: CloudSyncOptions
): Promise<ImageFile[]> {
  const uniqueCloudImages = new Map(cloudImages.map(image => [image.digest, image]));
  const readableImageDigests = await getReadableImageDigests([...uniqueCloudImages.keys()], signal);
  const missingCloudImages = [...uniqueCloudImages.values()].filter(
    ({digest}) => !readableImageDigests.has(digest)
  );
  if (missingCloudImages.length === 0) {
    return [];
  }

  const imagesFolder = await client.findFolder(
    rootFolder,
    IMAGES_FOLDER_NAME,
    CloudItemPurpose.ImagesFolder
  );
  if (!imagesFolder) {
    throw new CloudError(CloudErrorType.CloudDataNotFound, 'Cloud photos folder is missing');
  }

  const candidatesByDigest = indexRemoteImagesByDigest(
    provider,
    await client.listFiles(imagesFolder, CloudItemPurpose.Image)
  );

  const downloadedImages: ImageFile[] = [];
  for (const [i, cloudImage] of missingCloudImages.entries()) {
    signal?.throwIfAborted();
    onProgress?.({type: CloudSyncType.Download, index: i + 1, count: missingCloudImages.length});
    const download = await downloadVerifiedRemoteImage(
      client,
      cloudImage.digest,
      candidatesByDigest.get(cloudImage.digest),
      signal
    );
    if (download.status === 'missing') {
      throw new CloudError(CloudErrorType.CloudDataNotFound, 'A synced photo is missing');
    }
    if (download.status === 'invalid') {
      throw new Error(`Cloud image digest mismatch: ${cloudImage.digest}`);
    }
    signal?.throwIfAborted();
    downloadedImages.push({
      ...cloudImage,
      blob: new Blob([download.bytes], {type: cloudImage.type}),
      date: download.file.modifiedAt,
    });
  }
  return downloadedImages;
}

function indexRemoteImagesByDigest<T>(
  provider: CloudProvider,
  files: CloudFile<T>[]
): Map<string, CloudFile<T>[]> {
  const candidatesByDigest = new Map<string, CloudFile<T>[]>();
  for (const file of sortNewestFirst(files)) {
    const digest = getRemoteImageDigest(provider, file);
    if (!digest) {
      continue;
    }
    const candidates = candidatesByDigest.get(digest);
    if (candidates) {
      candidates.push(file);
    } else {
      candidatesByDigest.set(digest, [file]);
    }
  }
  return candidatesByDigest;
}

async function downloadVerifiedRemoteImage<T>(
  client: CloudClient<T>,
  digest: string,
  candidates: CloudFile<T>[] = [],
  signal?: AbortSignal
): Promise<RemoteImageDownload<T>> {
  let downloaded = false;
  for (const file of candidates) {
    signal?.throwIfAborted();
    const bytes = await client.downloadFile(file);
    if (!bytes) {
      continue;
    }
    downloaded = true;
    signal?.throwIfAborted();
    if ((await digestArrayBuffer(bytes)) === digest) {
      return {status: 'verified', file, bytes};
    }
  }
  return {status: downloaded ? 'invalid' : 'missing'};
}

async function repairImage<T>(
  client: CloudClient<T>,
  provider: CloudProvider,
  digest: string,
  cloudSync?: CloudSync
): Promise<ArrayBuffer | null> {
  const rootFolder = await resolveRootFolder(client, cloudSync?.remoteItems);
  if (!rootFolder) {
    return null;
  }
  const imagesFolder = await client.findFolder(
    rootFolder,
    IMAGES_FOLDER_NAME,
    CloudItemPurpose.ImagesFolder
  );
  if (!imagesFolder) {
    return null;
  }
  const candidatesByDigest = indexRemoteImagesByDigest(
    provider,
    await client.listFiles(imagesFolder, CloudItemPurpose.Image)
  );
  const download = await downloadVerifiedRemoteImage(
    client,
    digest,
    candidatesByDigest.get(digest)
  );
  return download.status === 'verified' ? download.bytes : null;
}

function sortNewestFirst<T>(files: CloudFile<T>[]): CloudFile<T>[] {
  return [...files].sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());
}

function getRemoteImageDigest<T>(provider: CloudProvider, file: CloudFile<T>): string | undefined {
  switch (provider) {
    case CloudProvider.Google:
      return validContentDigest(file.contentDigest);
    case CloudProvider.Microsoft:
    case CloudProvider.Dropbox:
      return validContentDigest(getFilename(file));
  }
}

function validContentDigest(value: string | undefined): string | undefined {
  return value && /^[\da-f]{64}$/.test(value) ? value : undefined;
}

function cloudImageFileName(provider: CloudProvider, {digest, name, type}: CloudImage): string {
  const extension = getExtensionForMimeType(type) ?? 'bin';
  if (provider !== CloudProvider.Google) {
    return `${digest}.${extension}`;
  }
  const sanitizedName = name?.trim().replaceAll('/', '-').replaceAll('\\', '-');
  if (!sanitizedName) {
    return `Reference photo ${digest.slice(0, 8)}.${extension}`;
  }
  return addExtensionIfMissing(sanitizedName, extension);
}

async function getConnectionCloudSync(
  cloudConnection: CloudConnection,
  localStateConnection?: LocalStateConnection
): Promise<CloudSync | undefined> {
  return localStateConnection?.connectionId === cloudConnection.id
    ? await getCloudSync(cloudConnection.id)
    : undefined;
}

async function createCloudSyncContext({
  user: {id: userId},
  cloudConnection,
  localStateConnection,
  connectionCloudSync,
  localState,
}: CloudSyncRequest): Promise<CloudSyncContext> {
  const {json: localStateJson, hash: localStateHash} = await serializeAndHashCloudState(localState);
  const {hash: emptyCloudStateHash} = await serializeAndHashCloudState(EMPTY_CLOUD_STATE);
  return {
    recreateDeletedRemoteItems: false,
    cloudConnection,
    userId,
    localStateConnection,
    connectionCloudSync,
    localState,
    localStateJson,
    localStateHash,
    localStateIsEmpty: localStateHash === emptyCloudStateHash,
  };
}

interface CloudSyncRequest {
  user: User;
  cloudConnection: CloudConnection;
  localStateConnection?: LocalStateConnection;
  connectionCloudSync?: CloudSync;
  localState: CloudState;
  storeChangeTokens: StoreChangeTokens;
}

async function createCloudSyncRequest(
  user: User,
  cloudConnection: CloudConnection,
  localStateConnection?: LocalStateConnection,
  connectionCloudSync?: CloudSync
): Promise<CloudSyncRequest> {
  const {customBrands, colorSets, images, colorMixtures, storeChangeTokens} = await getLocalState();
  const localState = createCloudState({customBrands, colorSets, images, colorMixtures});
  return {
    user,
    cloudConnection,
    localStateConnection,
    connectionCloudSync,
    localState,
    storeChangeTokens,
  };
}

function completeCloudSyncResult(
  result: CloudSyncResult,
  startedAt: Date,
  localStateConnection?: LocalStateConnection,
  connectionCloudSync?: CloudSync
): CloudSyncResult {
  if (result.type === CloudSyncType.Unchanged) {
    if (!connectionCloudSync || !localStateConnection) {
      return result;
    }
    return {
      ...result,
      cloudSync: {
        ...connectionCloudSync,
        // A result may carry a repaired revision for content-identical remote rewrites.
        ...result.cloudSync,
        // Start time, not completion time: a queued op may have writes newer than its captured state.
        lastSyncedAt: startedAt,
      },
      stateHash: localStateConnection.stateHash,
    };
  }
  return {
    ...result,
    cloudSync: {
      ...result.cloudSync,
      // Start time, not completion time: a queued op may have writes newer than its captured state.
      lastSyncedAt: startedAt,
    },
  };
}

type CloudSyncOperation = 'sync' | 'push' | 'upload' | 'download';

async function saveCloudSyncResult(
  result: CloudSyncResult,
  expectedTokens: StoreChangeTokens,
  userId: string
): Promise<CloudSyncResult> {
  if (result.type === CloudSyncType.Download) {
    return {
      ...result,
      storeChangeTokens: await replaceLocalStateFromCloud(result, expectedTokens, userId),
    };
  }
  if (result.cloudSync && result.stateHash !== undefined) {
    await saveCloudSync(result.cloudSync, {
      connectionId: result.cloudSync.connectionId,
      stateHash: result.stateHash,
      userId,
    });
  }
  return result;
}

const CLOUD_SYNC_CLIENTS: Record<CloudProvider, CloudSyncClient> = {
  [CloudProvider.Google]: createCloudSyncClient(CloudProvider.Google, new GoogleDriveClient()),
  [CloudProvider.Microsoft]: createCloudSyncClient(
    CloudProvider.Microsoft,
    new MicrosoftOneDriveClient()
  ),
  [CloudProvider.Dropbox]: createCloudSyncClient(CloudProvider.Dropbox, new DropboxClient()),
};

function getCloudSyncClient(provider: CloudProvider): CloudSyncClient {
  return CLOUD_SYNC_CLIENTS[provider];
}

async function runCloudSyncOperation(
  user: User,
  operation: CloudSyncOperation,
  {signal, onProgress}: CloudSyncOptions = {}
): Promise<CloudSyncResult | null> {
  const startedAt = new Date();
  return await withCloudLock(async (): Promise<CloudSyncResult | null> => {
    signal?.throwIfAborted();
    try {
      const cloudConnection = await getCloudConnection();
      if (!cloudConnection) {
        console.log(`[cloud-sync] ${operation} skipped: cloud is not connected`);
        return null;
      }
      console.log(`[cloud-sync] ${operation} started (${cloudConnection.provider})`);
      const localStateConnection = await getLocalStateConnection();
      const connectionCloudSync = await getConnectionCloudSync(
        cloudConnection,
        localStateConnection
      );
      if (connectionCloudSync?.lastSyncedAt && startedAt <= connectionCloudSync.lastSyncedAt) {
        console.log(`[cloud-sync] ${operation} skipped: already synced`);
        return {type: CloudSyncType.Unchanged};
      }
      const request = await createCloudSyncRequest(
        user,
        cloudConnection,
        localStateConnection,
        connectionCloudSync
      );
      const context = {
        ...(await createCloudSyncContext(request)),
        signal,
        onProgress,
        recreateDeletedRemoteItems: operation === 'upload',
      };
      const client = getCloudSyncClient(request.cloudConnection.provider);
      const result = completeCloudSyncResult(
        await client[operation](context),
        startedAt,
        localStateConnection,
        connectionCloudSync
      );
      const savedResult = await saveCloudSyncResult(result, request.storeChangeTokens, user.id);
      const revision = savedResult.cloudSync?.lastSyncedRev;
      console.log(
        `[cloud-sync] ${operation} finished: ${savedResult.type}` +
          `${revision ? `, revision ${revision}` : ''} (${Date.now() - startedAt.getTime()} ms)`
      );
      return savedResult;
    } catch (error) {
      console.error(
        `[cloud-sync] ${operation} failed (${Date.now() - startedAt.getTime()} ms)`,
        error
      );
      throw error;
    }
  }, signal);
}

export async function syncCloudState(
  user: User,
  options?: CloudSyncOptions
): Promise<CloudSyncResult | null> {
  return await runCloudSyncOperation(user, 'sync', options);
}

export async function pushCloudState(
  user: User,
  options?: CloudSyncOptions
): Promise<CloudSyncResult | null> {
  return await runCloudSyncOperation(user, 'push', options);
}

export async function uploadCloudState(
  user: User,
  options?: CloudSyncOptions
): Promise<CloudSyncResult | null> {
  return await runCloudSyncOperation(user, 'upload', options);
}

export async function downloadCloudState(
  user: User,
  options?: CloudSyncOptions
): Promise<CloudSyncResult | null> {
  return await runCloudSyncOperation(user, 'download', options);
}

export async function repairCloudImage(digest: string): Promise<CloudImageRepairResult> {
  return await withCloudLock(async (): Promise<CloudImageRepairResult> => {
    const cloudConnection = await getCloudConnection();
    if (!cloudConnection) {
      return {status: 'unavailable'};
    }
    const cloudSync = await getCloudSync(cloudConnection.id);
    const bytes = await getCloudSyncClient(cloudConnection.provider).repairImage(digest, cloudSync);
    if (!bytes) {
      console.log(`[cloud-sync] no verified cloud copy of the photo ${digest.slice(0, 8)}`);
      return {status: 'unavailable'};
    }
    const repaired = await saveRepairedImageBytes(digest, bytes);
    console.log(
      `[cloud-sync] photo ${digest.slice(0, 8)} ` +
        (repaired ? 'restored from cloud storage' : 'no longer exists locally')
    );
    return repaired ? {status: 'restored', image: repaired} : {status: 'deleted'};
  });
}

export async function hasCloudDataChanged(): Promise<boolean> {
  return await withCloudLock(async (): Promise<boolean> => {
    const cloudConnection = await getCloudConnection();
    if (!cloudConnection) {
      return false;
    }
    const localStateConnection = await getLocalStateConnection();
    const connectionCloudSync = await getConnectionCloudSync(cloudConnection, localStateConnection);
    if (!connectionCloudSync || !localStateConnection) {
      return false;
    }
    return await getCloudSyncClient(cloudConnection.provider).hasCloudDataChanged(
      connectionCloudSync,
      localStateConnection
    );
  });
}

export async function disconnectCloud(permanent = false): Promise<StoreChangeTokens> {
  return await withCloudLock(async (): Promise<StoreChangeTokens> => {
    const cloudConnection = await getCloudConnection();
    if (cloudConnection) {
      try {
        const cloudSync = await getCloudSync(cloudConnection.id);
        await getCloudSyncClient(cloudConnection.provider).deleteCloudData(cloudSync, permanent);
      } catch (error) {
        throw CloudError.fromError(
          error,
          'Could not delete cloud data',
          CloudErrorType.CloudDataDeletionFailed
        );
      }
    }
    return await disconnectCloudConnection();
  });
}
