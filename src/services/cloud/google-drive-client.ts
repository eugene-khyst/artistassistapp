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
  type CloudClient,
  type CloudFile,
  type CloudFolder,
  type CloudItem,
  CloudItemKind,
  CloudItemPurpose,
  type UploadCloudFileRequest,
} from '@/services/cloud/cloud-client';
import {
  clearCloudAccessToken,
  getCloudAccessToken,
  readJson,
} from '@/services/cloud/cloud-connection-client';
import {CloudError, CloudErrorType} from '@/services/cloud/errors';
import {CloudProvider} from '@/services/cloud/types';

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const DRIVE_ROOT_FOLDER_ID = 'root';
const APP_ROOT_FOLDER_NAME = 'ArtistAssistApp';
const FILE_FIELDS = 'id,name,mimeType,modifiedTime,version,parents,appProperties,trashed';
const LIST_FILE_FIELDS = 'id,name,mimeType,modifiedTime,version,parents,appProperties';
const DRIVE_REQUEST_TIMEOUT_MS = 60 * 1000;
const DRIVE_FILE_TRANSFER_TIMEOUT_MS = 5 * 60 * 1000;
const MULTIPART_UPLOAD_MAX_SIZE = 5_000_000;
const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';
const APP_PROPERTY_KEY = 'artistassistapp';
const CONTENT_DIGEST_PROPERTY_KEY = 'artistassistappContentDigest';

export interface GoogleDriveItemData {
  id: string;
  name: string;
  mimeType?: string;
  modifiedTime?: string;
  version?: string;
  parents?: string[];
  appProperties?: Record<string, string>;
  trashed?: boolean;
}

interface DriveFileLookup {
  name?: string;
  parentId?: string;
  mimeType?: string;
  appProperties?: Record<string, string>;
}

interface UploadDriveFileRequest {
  fileId?: string;
  metadata: Record<string, unknown>;
  blob: Blob;
}

export class GoogleDriveClient implements CloudClient<GoogleDriveItemData> {
  async findAppRoot(): Promise<CloudFolder<GoogleDriveItemData> | null> {
    // If devices race to create roots, every device must keep choosing the same one.
    const existing = await findDriveFile(
      {
        mimeType: FOLDER_MIME_TYPE,
        appProperties: appProperties(CloudItemPurpose.RootFolder),
      },
      'createdTime'
    );
    return existing ? toCloudFolder(existing) : null;
  }

  async createAppRoot(): Promise<CloudFolder<GoogleDriveItemData>> {
    const existing = await this.findAppRoot();
    if (existing) {
      return existing;
    }
    return toCloudFolder(
      await createDriveFile({
        name: APP_ROOT_FOLDER_NAME,
        mimeType: FOLDER_MIME_TYPE,
        parents: [DRIVE_ROOT_FOLDER_ID],
        appProperties: appProperties(CloudItemPurpose.RootFolder),
      })
    );
  }

  async getFileById(
    fileId: string,
    parentId?: string
  ): Promise<CloudFile<GoogleDriveItemData> | null> {
    const url = driveFileUrl(DRIVE_API, fileId);
    url.searchParams.set('fields', FILE_FIELDS);
    const response = await driveFetch(url, {}, {allowNotFound: true});
    if (response.status === 404) {
      return null;
    }
    const data = await readJson<GoogleDriveItemData>(response);
    return data.trashed ||
      data.mimeType === FOLDER_MIME_TYPE ||
      (parentId && !data.parents?.includes(parentId))
      ? null
      : toCloudFile(data);
  }

  async getFolderById(folderId: string): Promise<CloudFolder<GoogleDriveItemData> | null> {
    const url = driveFileUrl(DRIVE_API, folderId);
    url.searchParams.set('fields', FILE_FIELDS);
    const response = await driveFetch(url, {}, {allowNotFound: true});
    if (response.status === 404) {
      return null;
    }
    const data = await readJson<GoogleDriveItemData>(response);
    return data.trashed || data.mimeType !== FOLDER_MIME_TYPE ? null : toCloudFolder(data);
  }

  async findFolder(
    parent: CloudFolder<GoogleDriveItemData>,
    name: string,
    purpose: CloudItemPurpose
  ): Promise<CloudFolder<GoogleDriveItemData> | null> {
    const file = await findDriveFile({
      name,
      parentId: parent.id,
      mimeType: FOLDER_MIME_TYPE,
      appProperties: appProperties(purpose),
    });
    return file ? toCloudFolder(file) : null;
  }

  async findFile(
    parent: CloudFolder<GoogleDriveItemData>,
    name: string,
    purpose: CloudItemPurpose
  ): Promise<CloudFile<GoogleDriveItemData> | null> {
    const lookup = {
      name,
      parentId: parent.id,
      mimeType: 'application/json',
      appProperties: appProperties(purpose),
    };
    const file =
      (await findDriveFile(lookup)) ??
      (await findDriveFile({
        parentId: parent.id,
        mimeType: 'application/json',
        appProperties: appProperties(purpose),
      }));
    return file ? toCloudFile(file) : null;
  }

  async listFiles(
    parent: CloudFolder<GoogleDriveItemData>,
    purpose?: CloudItemPurpose
  ): Promise<CloudFile<GoogleDriveItemData>[]> {
    const lookup = {
      parentId: parent.id,
      ...(purpose ? {appProperties: appProperties(purpose)} : {}),
    };
    return (await listDriveFiles(lookup))
      .filter(({mimeType}) => mimeType !== FOLDER_MIME_TYPE)
      .map(toCloudFile);
  }

  async createFolder(
    parent: CloudFolder<GoogleDriveItemData>,
    name: string,
    purpose: CloudItemPurpose
  ): Promise<CloudFolder<GoogleDriveItemData>> {
    return toCloudFolder(
      await createDriveFile({
        name,
        mimeType: FOLDER_MIME_TYPE,
        parents: [parent.id],
        appProperties: appProperties(purpose),
      })
    );
  }

  async uploadFile({
    parent,
    name,
    blob,
    existing,
    purpose,
    contentDigest,
  }: UploadCloudFileRequest<GoogleDriveItemData>): Promise<CloudFile<GoogleDriveItemData>> {
    return toCloudFile(
      await uploadDriveFile({
        fileId: existing?.id,
        metadata: {
          name,
          mimeType: blob.type || 'application/octet-stream',
          ...(purpose ? {appProperties: appProperties(purpose, contentDigest)} : {}),
          ...(!existing ? {parents: [parent.id]} : {}),
        },
        blob,
      })
    );
  }

  async downloadFile(file: CloudFile<GoogleDriveItemData>): Promise<ArrayBuffer | null> {
    const url = driveFileUrl(DRIVE_API, file.id);
    url.searchParams.set('alt', 'media');
    const response = await driveFetch(
      url,
      {
        signal: AbortSignal.timeout(DRIVE_FILE_TRANSFER_TIMEOUT_MS),
      },
      {allowNotFound: true}
    );
    if (response.status === 404) {
      return null;
    }
    try {
      return await response.arrayBuffer();
    } catch (error) {
      throw CloudError.fromFetchError(error, 'Could not download Google Drive file');
    }
  }

  async deleteItem(item: CloudItem<GoogleDriveItemData>): Promise<void> {
    await deleteDriveItem(item.id);
  }

  async deleteAppData(rootFolderId?: string, permanent = false): Promise<void> {
    const root =
      (rootFolderId ? await this.getFolderById(rootFolderId) : null) ?? (await this.findAppRoot());
    if (!root) {
      return;
    }
    if (permanent) {
      await deleteDriveItem(root.id);
    } else {
      await trashDriveItem(root.id);
    }
  }
}

async function createDriveFile(metadata: Record<string, unknown>): Promise<GoogleDriveItemData> {
  const url = new URL(`${DRIVE_API}/files`);
  url.searchParams.set('fields', FILE_FIELDS);
  const response = await driveFetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(metadata),
  });
  return await readJson<GoogleDriveItemData>(response);
}

async function findDriveFile(
  {name, parentId, mimeType, appProperties}: DriveFileLookup,
  orderBy = 'modifiedTime desc'
): Promise<GoogleDriveItemData | null> {
  const url = new URL(`${DRIVE_API}/files`);
  url.searchParams.set('q', filesQuery({name, parentId, mimeType, appProperties}));
  url.searchParams.set('fields', `files(${LIST_FILE_FIELDS})`);
  url.searchParams.set('orderBy', orderBy);
  url.searchParams.set('pageSize', '1');

  const response = await driveFetch(url);
  const {files} = await readJson<{files?: GoogleDriveItemData[]}>(response);
  const [file] = files ?? [];
  return file ?? null;
}

async function listDriveFiles({
  name,
  parentId,
  mimeType,
  appProperties,
}: DriveFileLookup): Promise<GoogleDriveItemData[]> {
  const files: GoogleDriveItemData[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(`${DRIVE_API}/files`);
    const query = filesQuery({name, parentId, mimeType, appProperties});
    if (query) {
      url.searchParams.set('q', query);
    }
    url.searchParams.set('fields', `nextPageToken,files(${LIST_FILE_FIELDS})`);
    url.searchParams.set('orderBy', 'modifiedTime desc');
    url.searchParams.set('pageSize', '1000');
    if (pageToken) {
      url.searchParams.set('pageToken', pageToken);
    }

    const response = await driveFetch(url);
    const page = await readJson<{
      files?: GoogleDriveItemData[];
      nextPageToken?: string;
    }>(response);
    files.push(...(page.files ?? []));
    pageToken = page.nextPageToken;
  } while (pageToken);

  return files;
}

async function deleteDriveItem(fileId: string): Promise<void> {
  const url = driveFileUrl(DRIVE_API, fileId);
  await driveFetch(url, {method: 'DELETE'}, {allowNotFound: true});
}

async function trashDriveItem(fileId: string): Promise<void> {
  const url = driveFileUrl(DRIVE_API, fileId);
  await driveFetch(
    url,
    {
      method: 'PATCH',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({trashed: true}),
    },
    {allowNotFound: true}
  );
}

async function uploadDriveFile(request: UploadDriveFileRequest): Promise<GoogleDriveItemData> {
  return request.blob.size <= MULTIPART_UPLOAD_MAX_SIZE
    ? await uploadMultipart(request)
    : await uploadResumable(request);
}

async function uploadMultipart({
  fileId,
  metadata,
  blob,
}: UploadDriveFileRequest): Promise<GoogleDriveItemData> {
  const boundary = crypto.randomUUID();
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
    JSON.stringify(metadata),
    `\r\n--${boundary}\r\nContent-Type: ${blob.type || 'application/octet-stream'}\r\n\r\n`,
    blob,
    `\r\n--${boundary}--`,
  ]);
  const url = fileId
    ? driveFileUrl(DRIVE_UPLOAD_API, fileId)
    : new URL(`${DRIVE_UPLOAD_API}/files`);
  url.searchParams.set('uploadType', 'multipart');
  url.searchParams.set('fields', LIST_FILE_FIELDS);

  const response = await driveFetch(url, {
    method: fileId ? 'PATCH' : 'POST',
    headers: {
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
    signal: AbortSignal.timeout(DRIVE_FILE_TRANSFER_TIMEOUT_MS),
  });
  return await readJson<GoogleDriveItemData>(response);
}

async function uploadResumable({
  fileId,
  metadata,
  blob,
}: UploadDriveFileRequest): Promise<GoogleDriveItemData> {
  const url = fileId
    ? driveFileUrl(DRIVE_UPLOAD_API, fileId)
    : new URL(`${DRIVE_UPLOAD_API}/files`);
  url.searchParams.set('uploadType', 'resumable');
  url.searchParams.set('fields', LIST_FILE_FIELDS);
  const contentType = blob.type || 'application/octet-stream';

  const sessionResponse = await driveFetch(url, {
    method: fileId ? 'PATCH' : 'POST',
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Length': String(blob.size),
      'X-Upload-Content-Type': contentType,
    },
    body: JSON.stringify(metadata),
  });
  const uploadUrl = sessionResponse.headers.get('Location');
  if (!uploadUrl) {
    throw new Error('Google Drive resumable upload URL is missing');
  }

  const response = await driveFetch(uploadUrl, {
    method: 'PUT',
    headers: {'Content-Type': contentType},
    body: blob,
    signal: AbortSignal.timeout(DRIVE_FILE_TRANSFER_TIMEOUT_MS),
  });
  return await readJson<GoogleDriveItemData>(response);
}

async function driveFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  {
    allowNotFound = false,
    retryOnUnauthorized = true,
  }: {
    allowNotFound?: boolean;
    retryOnUnauthorized?: boolean;
  } = {}
): Promise<Response> {
  const {accessToken} = await getCloudAccessToken(CloudProvider.Google);
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);
  let response: Response;
  try {
    response = await fetch(input, {
      ...init,
      cache: 'no-store',
      headers,
      signal: init.signal ?? AbortSignal.timeout(DRIVE_REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw CloudError.fromFetchError(error, 'Could not access Google Drive');
  }
  if (response.status === 401) {
    clearCloudAccessToken(accessToken);
    if (retryOnUnauthorized) {
      console.warn('[cloud-sync] Google Drive access token rejected, retrying with a fresh token');
      return await driveFetch(input, init, {allowNotFound, retryOnUnauthorized: false});
    }
    throw new CloudError(CloudErrorType.AuthorizationFailed, 'Google Drive authorization failed');
  }
  if (response.status === 404 && allowNotFound) {
    return response;
  }
  if (response.status === 429) {
    throw new CloudError(CloudErrorType.RateLimited, 'Google Drive rate limit exceeded');
  }
  if (!response.ok) {
    let message: string;
    try {
      message = await response.text();
    } catch (error) {
      throw CloudError.fromFetchError(error, 'Could not access Google Drive');
    }
    throw new Error(
      `Google Drive request failed (${response.status}): ${message || response.statusText}`
    );
  }
  return response;
}

function driveFileUrl(apiUrl: string, fileId: string): URL {
  return new URL(`${apiUrl}/files/${encodeURIComponent(fileId)}`);
}

function filesQuery({name, parentId, mimeType, appProperties}: DriveFileLookup): string {
  return [
    name ? `name = '${escapeDriveQueryString(name)}'` : undefined,
    'trashed = false',
    parentId ? `'${escapeDriveQueryString(parentId)}' in parents` : undefined,
    mimeType ? `mimeType = '${escapeDriveQueryString(mimeType)}'` : undefined,
    ...appPropertiesQuery(appProperties),
  ]
    .filter((part): part is string => !!part)
    .join(' and ');
}

function appProperties(purpose: CloudItemPurpose, contentDigest?: string): Record<string, string> {
  return {
    [APP_PROPERTY_KEY]: purpose,
    ...(contentDigest ? {[CONTENT_DIGEST_PROPERTY_KEY]: contentDigest} : {}),
  };
}

function appPropertiesQuery(properties: Record<string, string> = {}): string[] {
  return Object.entries(properties).map(
    ([key, value]) =>
      `appProperties has { key='${escapeDriveQueryString(
        key
      )}' and value='${escapeDriveQueryString(value)}' }`
  );
}

function escapeDriveQueryString(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll("'", "\\'");
}

function toCloudFolder(data: GoogleDriveItemData): CloudFolder<GoogleDriveItemData> {
  if (data.mimeType !== FOLDER_MIME_TYPE) {
    throw new Error(`Google Drive item is not a folder: ${data.id}`);
  }
  return {
    id: data.id,
    name: data.name,
    kind: CloudItemKind.Folder,
    data,
  };
}

function toCloudFile(data: GoogleDriveItemData): CloudFile<GoogleDriveItemData> {
  if (data.mimeType === FOLDER_MIME_TYPE) {
    throw new Error(`Google Drive item is not a file: ${data.id}`);
  }
  if (!data.version) {
    throw new Error(`Google Drive file version is missing: ${data.id}`);
  }
  if (!data.modifiedTime) {
    throw new Error(`Google Drive file modification time is missing: ${data.id}`);
  }
  const modifiedAt = new Date(data.modifiedTime);
  if (Number.isNaN(modifiedAt.getTime())) {
    throw new Error(`Google Drive file modification time is invalid: ${data.id}`);
  }
  return {
    id: data.id,
    name: data.name,
    kind: CloudItemKind.File,
    ...(data.appProperties?.[CONTENT_DIGEST_PROPERTY_KEY]
      ? {contentDigest: data.appProperties[CONTENT_DIGEST_PROPERTY_KEY]}
      : {}),
    revision: data.version,
    modifiedAt,
    data,
  };
}
