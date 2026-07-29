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

import type {
  CloudClient,
  CloudFile,
  CloudFolder,
  CloudItem,
  UploadCloudFileRequest,
} from '@/services/cloud/cloud-client';
import {CloudItemKind, type CloudItemPurpose} from '@/services/cloud/cloud-client';
import {
  clearCloudAccessToken,
  getCloudAccessToken,
  readJson,
} from '@/services/cloud/cloud-connection-client';
import {CloudError, CloudErrorType} from '@/services/cloud/errors';
import {CloudProvider} from '@/services/cloud/types';

const GRAPH_API = 'https://graph.microsoft.com/v1.0';
const APP_ROOT_ID = 'special/approot';
const DRIVE_ITEM_FIELDS =
  'id,name,eTag,cTag,lastModifiedDateTime,folder,file,deleted,@microsoft.graph.downloadUrl';
const ONE_DRIVE_REQUEST_TIMEOUT_MS = 60 * 1000;
const ONE_DRIVE_FILE_TRANSFER_TIMEOUT_MS = 5 * 60 * 1000;
const UPLOAD_SESSION_THRESHOLD = 10 * 1024 * 1024;
const UPLOAD_CHUNK_SIZE = 10 * 1024 * 1024;

export interface OneDriveItemData {
  id: string;
  name?: string;
  eTag?: string;
  cTag?: string;
  lastModifiedDateTime?: string;
  folder?: Record<string, unknown>;
  file?: Record<string, unknown>;
  deleted?: Record<string, unknown>;
  '@microsoft.graph.downloadUrl'?: string;
}

interface OneDriveItemsPage {
  value?: OneDriveItemData[];
  '@odata.nextLink'?: string;
}

interface OneDriveUploadSession {
  uploadUrl?: string;
}

interface UploadOneDriveFileRequest {
  parentId: string;
  name: string;
  blob: Blob;
  fileId?: string;
}

export class MicrosoftOneDriveClient implements CloudClient<OneDriveItemData> {
  async findAppRoot(): Promise<CloudFolder<OneDriveItemData> | null> {
    return await getFolder(APP_ROOT_ID);
  }

  async createAppRoot(): Promise<CloudFolder<OneDriveItemData>> {
    const root = await getFolder(APP_ROOT_ID);
    if (!root) {
      throw new Error('Microsoft OneDrive app folder could not be created');
    }
    return root;
  }

  async getFileById(fileId: string): Promise<CloudFile<OneDriveItemData> | null> {
    // No $select: consumer OneDrive omits @microsoft.graph.downloadUrl when $select is used.
    const response = await oneDriveFetch(itemUrl(fileId), {}, {allowNotFound: true});
    if (response.status === 404) {
      return null;
    }
    const item = await readJson<OneDriveItemData>(response);
    return item.deleted || item.folder ? null : toCloudFile(item);
  }

  async getFolderById(folderId: string): Promise<CloudFolder<OneDriveItemData> | null> {
    return await getFolder(folderId);
  }

  async findFolder(
    parent: CloudFolder<OneDriveItemData>,
    name: string,
    _purpose: CloudItemPurpose
  ): Promise<CloudFolder<OneDriveItemData> | null> {
    const item = await getChild(parent.id, name);
    return item?.folder ? toCloudFolder(item) : null;
  }

  async findFile(
    parent: CloudFolder<OneDriveItemData>,
    name: string,
    _purpose: CloudItemPurpose
  ): Promise<CloudFile<OneDriveItemData> | null> {
    const item = await getChild(parent.id, name);
    return item && !item.folder ? toCloudFile(item) : null;
  }

  async listFiles(parent: CloudFolder<OneDriveItemData>): Promise<CloudFile<OneDriveItemData>[]> {
    return (await listChildren(parent.id)).filter(item => !item.folder).map(toCloudFile);
  }

  async createFolder(
    parent: CloudFolder<OneDriveItemData>,
    name: string,
    _purpose: CloudItemPurpose
  ): Promise<CloudFolder<OneDriveItemData>> {
    const response = await oneDriveFetch(childrenUrl(parent.id), {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        name,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'fail',
      }),
    });
    return toCloudFolder(await readJson<OneDriveItemData>(response));
  }

  async uploadFile({
    parent,
    name,
    blob,
    existing,
  }: UploadCloudFileRequest<OneDriveItemData>): Promise<CloudFile<OneDriveItemData>> {
    return toCloudFile(
      await uploadOneDriveFile({
        parentId: parent.id,
        name,
        blob,
        fileId: existing?.id,
      })
    );
  }

  async downloadFile(file: CloudFile<OneDriveItemData>): Promise<ArrayBuffer | null> {
    // Graph's /content redirect is blocked by browser CORS after the authenticated preflight, so
    // files are read from the short-lived preauthenticated URL that comes with their metadata.
    const downloadUrl =
      file.data['@microsoft.graph.downloadUrl'] ?? (await getDownloadUrl(file.id));
    if (!downloadUrl) {
      return null;
    }
    const response = await oneDriveDownloadFetch(downloadUrl);
    try {
      return await response.arrayBuffer();
    } catch (error) {
      throw CloudError.fromFetchError(error, 'Could not download Microsoft OneDrive file');
    }
  }

  async deleteItem(item: CloudItem<OneDriveItemData>): Promise<void> {
    await oneDriveFetch(itemUrl(item.id), {method: 'DELETE'}, {allowNotFound: true});
  }

  async deleteAppData(rootFolderId?: string, _permanent = false): Promise<void> {
    const root =
      (rootFolderId ? await this.getFolderById(rootFolderId) : null) ?? (await this.findAppRoot());
    if (root) {
      await this.deleteItem(root);
    }
  }
}

async function listChildren(parentId: string): Promise<OneDriveItemData[]> {
  const files: OneDriveItemData[] = [];
  let url: URL | null = childrenUrl(parentId);
  url.searchParams.set('$select', DRIVE_ITEM_FIELDS);
  url.searchParams.set('$top', '999');

  while (url) {
    const page: OneDriveItemsPage = await readJson<OneDriveItemsPage>(await oneDriveFetch(url));
    files.push(...(page.value ?? []).filter(item => !item.deleted));
    const nextLink: string | undefined = page['@odata.nextLink'];
    url = nextLink ? new URL(nextLink) : null;
  }

  return files;
}

async function getChild(parentId: string, name: string): Promise<OneDriveItemData | null> {
  const response = await oneDriveFetch(childUrl(parentId, name), {}, {allowNotFound: true});
  if (response.status === 404) {
    return null;
  }
  const item = await readJson<OneDriveItemData>(response);
  return item.deleted ? null : item;
}

async function getFolder(folderId: string): Promise<CloudFolder<OneDriveItemData> | null> {
  const response = await oneDriveFetch(itemUrl(folderId), {}, {allowNotFound: true});
  if (response.status === 404) {
    return null;
  }
  const item = await readJson<OneDriveItemData>(response);
  return item.deleted || !item.folder ? null : toCloudFolder(item);
}

async function getDownloadUrl(fileId: string): Promise<string | null> {
  // No $select: consumer OneDrive omits @microsoft.graph.downloadUrl when $select is used.
  const response = await oneDriveFetch(itemUrl(fileId), {}, {allowNotFound: true});
  if (response.status === 404) {
    return null;
  }
  const item = await readJson<OneDriveItemData>(response);
  if (item.deleted) {
    return null;
  }
  const downloadUrl = item['@microsoft.graph.downloadUrl'];
  if (!downloadUrl) {
    throw new Error('Microsoft OneDrive file download URL is missing');
  }
  return downloadUrl;
}

async function uploadOneDriveFile(request: UploadOneDriveFileRequest): Promise<OneDriveItemData> {
  return request.blob.size <= UPLOAD_SESSION_THRESHOLD
    ? await uploadFileContents(request)
    : await uploadFileWithSession(request);
}

async function uploadFileContents({
  parentId,
  name,
  blob,
  fileId,
}: UploadOneDriveFileRequest): Promise<OneDriveItemData> {
  const url = fileId
    ? graphUrl(`${itemPath(fileId)}/content`)
    : childUrl(parentId, name, ':/content');
  const response = await oneDriveFetch(url, {
    method: 'PUT',
    headers: {'Content-Type': blob.type || 'application/octet-stream'},
    body: blob,
    signal: AbortSignal.timeout(ONE_DRIVE_FILE_TRANSFER_TIMEOUT_MS),
  });
  return await readJson<OneDriveItemData>(response);
}

async function uploadFileWithSession({
  parentId,
  name,
  blob,
  fileId,
}: UploadOneDriveFileRequest): Promise<OneDriveItemData> {
  const url = fileId
    ? graphUrl(`${itemPath(fileId)}/createUploadSession`)
    : childUrl(parentId, name, ':/createUploadSession');
  const sessionResponse = await oneDriveFetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      item: {
        name,
        '@microsoft.graph.conflictBehavior': 'replace',
      },
    }),
  });
  const {uploadUrl} = await readJson<OneDriveUploadSession>(sessionResponse);
  if (!uploadUrl) {
    throw new Error('Microsoft OneDrive upload session URL is missing');
  }

  let response: Response | undefined;
  for (let start = 0; start < blob.size; start += UPLOAD_CHUNK_SIZE) {
    const end = Math.min(start + UPLOAD_CHUNK_SIZE, blob.size);
    response = await oneDriveUploadFetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Range': `bytes ${start}-${end - 1}/${blob.size}`,
      },
      body: blob.slice(start, end),
      signal: AbortSignal.timeout(ONE_DRIVE_FILE_TRANSFER_TIMEOUT_MS),
    });
  }
  if (!response || (response.status !== 200 && response.status !== 201)) {
    throw new Error('Microsoft OneDrive upload session did not return the uploaded file');
  }
  return await readJson<OneDriveItemData>(response);
}

async function oneDriveDownloadFetch(input: RequestInfo | URL): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(input, {
      cache: 'no-store',
      signal: AbortSignal.timeout(ONE_DRIVE_FILE_TRANSFER_TIMEOUT_MS),
    });
  } catch (error) {
    throw CloudError.fromFetchError(error, 'Could not download Microsoft OneDrive file');
  }
  return await validateOneDriveResponse(response, false);
}

async function oneDriveFetch(
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
  const {accessToken} = await getCloudAccessToken(CloudProvider.Microsoft);
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);
  let response: Response;
  try {
    response = await fetch(input, {
      ...init,
      cache: 'no-store',
      headers,
      signal: init.signal ?? AbortSignal.timeout(ONE_DRIVE_REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw CloudError.fromFetchError(error, 'Could not access Microsoft OneDrive');
  }
  if (response.status === 401) {
    clearCloudAccessToken(accessToken);
    if (retryOnUnauthorized) {
      console.warn('[cloud-sync] OneDrive access token rejected, retrying with a fresh token');
      return await oneDriveFetch(input, init, {
        allowNotFound,
        retryOnUnauthorized: false,
      });
    }
    throw new CloudError(
      CloudErrorType.AuthorizationFailed,
      'Microsoft OneDrive authorization failed'
    );
  }
  return await validateOneDriveResponse(response, allowNotFound);
}

async function oneDriveUploadFetch(input: RequestInfo | URL, init: RequestInit): Promise<Response> {
  // Upload-session URLs are preauthenticated and must not receive the Graph bearer token.
  let response: Response;
  try {
    response = await fetch(input, {
      ...init,
      cache: 'no-store',
    });
  } catch (error) {
    throw CloudError.fromFetchError(error, 'Could not upload Microsoft OneDrive file');
  }
  return await validateOneDriveResponse(response, false);
}

async function validateOneDriveResponse(
  response: Response,
  allowNotFound: boolean
): Promise<Response> {
  if (response.status === 404 && allowNotFound) {
    return response;
  }
  if (response.status === 429) {
    throw new CloudError(CloudErrorType.RateLimited, 'Microsoft OneDrive rate limit exceeded');
  }
  if (!response.ok) {
    let message: string;
    try {
      message = await response.text();
    } catch (error) {
      throw CloudError.fromFetchError(error, 'Could not access Microsoft OneDrive');
    }
    throw new Error(
      `Microsoft OneDrive request failed (${response.status}): ${message || response.statusText}`
    );
  }
  return response;
}

function graphUrl(path: string): URL {
  return new URL(`${GRAPH_API}${path}`);
}

function itemPath(id: string): string {
  return id === APP_ROOT_ID
    ? '/me/drive/special/approot'
    : `/me/drive/items/${encodeURIComponent(id)}`;
}

function itemUrl(id: string): URL {
  return graphUrl(itemPath(id));
}

function childrenUrl(parentId: string): URL {
  return graphUrl(`${itemPath(parentId)}/children`);
}

// Path-based addressing relative to the parent: one request instead of listing every child.
function childUrl(parentId: string, name: string, action = ''): URL {
  return graphUrl(`${itemPath(parentId)}:/${encodeURIComponent(name)}${action}`);
}

function toCloudFolder(data: OneDriveItemData): CloudFolder<OneDriveItemData> {
  if (!data.folder) {
    throw new Error(`Microsoft OneDrive item is not a folder: ${data.id}`);
  }
  return {
    id: data.id,
    name: data.name ?? '',
    kind: CloudItemKind.Folder,
    data,
  };
}

function toCloudFile(data: OneDriveItemData): CloudFile<OneDriveItemData> {
  if (data.folder) {
    throw new Error(`Microsoft OneDrive item is not a file: ${data.id}`);
  }
  const revision = data.cTag ?? data.eTag;
  if (!revision) {
    throw new Error(`Microsoft OneDrive file revision is missing: ${data.id}`);
  }
  if (!data.lastModifiedDateTime) {
    throw new Error(`Microsoft OneDrive file modification time is missing: ${data.id}`);
  }
  const modifiedAt = new Date(data.lastModifiedDateTime);
  if (Number.isNaN(modifiedAt.getTime())) {
    throw new Error(`Microsoft OneDrive file modification time is invalid: ${data.id}`);
  }
  return {
    id: data.id,
    name: data.name ?? '',
    kind: CloudItemKind.File,
    revision,
    modifiedAt,
    data,
  };
}
