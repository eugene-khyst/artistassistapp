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
  CloudItemPurpose,
  UploadCloudFileRequest,
} from '@/services/cloud/cloud-client';
import {CloudItemKind} from '@/services/cloud/cloud-client';
import {
  clearCloudAccessToken,
  getCloudAccessToken,
  readJson,
} from '@/services/cloud/cloud-connection-client';
import {CloudError, CloudErrorType} from '@/services/cloud/errors';
import {CloudProvider} from '@/services/cloud/types';
import {safeReadJson} from '@/utils/json';

const DROPBOX_API = 'https://api.dropboxapi.com/2';
const DROPBOX_CONTENT_API = 'https://content.dropboxapi.com/2';
const DROPBOX_REQUEST_TIMEOUT_MS = 60 * 1000;
const DROPBOX_FILE_TRANSFER_TIMEOUT_MS = 5 * 60 * 1000;
const SIMPLE_UPLOAD_MAX_SIZE = 150 * 1024 * 1024;
const UPLOAD_CHUNK_SIZE = 8 * 1024 * 1024;

export interface DropboxItemData {
  '.tag': 'file' | 'folder' | 'deleted';
  id?: string;
  name: string;
  path_lower?: string;
  path_display?: string;
  rev?: string;
  server_modified?: string;
}

interface DropboxListFolderResult {
  entries?: DropboxItemData[];
  cursor?: string;
  has_more?: boolean;
}

interface DropboxCreateFolderResult {
  metadata: DropboxItemData;
}

interface DropboxUploadSessionStartResult {
  session_id?: string;
}

interface DropboxErrorResponse {
  error_summary?: string;
}

interface UploadDropboxFileRequest {
  path: string;
  blob: Blob;
}

export class DropboxClient implements CloudClient<DropboxItemData> {
  findAppRoot(): Promise<CloudFolder<DropboxItemData>> {
    return Promise.resolve(dropboxAppRoot());
  }

  createAppRoot(): Promise<CloudFolder<DropboxItemData>> {
    return Promise.resolve(dropboxAppRoot());
  }

  async getFileById(fileId: string): Promise<CloudFile<DropboxItemData> | null> {
    const item = await getMetadata(fileId);
    return item?.['.tag'] === 'file' ? toCloudFile(item) : null;
  }

  async getFolderById(folderId: string): Promise<CloudFolder<DropboxItemData> | null> {
    if (!folderId) {
      return dropboxAppRoot();
    }
    const item = await getMetadata(folderId);
    return item?.['.tag'] === 'folder' ? toCloudFolder(item) : null;
  }

  async findFolder(
    parent: CloudFolder<DropboxItemData>,
    name: string,
    _purpose: CloudItemPurpose
  ): Promise<CloudFolder<DropboxItemData> | null> {
    const item = await getMetadata(childPath(itemPath(parent.data), name));
    return item?.['.tag'] === 'folder' ? toCloudFolder(item) : null;
  }

  async findFile(
    parent: CloudFolder<DropboxItemData>,
    name: string,
    _purpose: CloudItemPurpose
  ): Promise<CloudFile<DropboxItemData> | null> {
    const item = await getMetadata(childPath(itemPath(parent.data), name));
    return item?.['.tag'] === 'file' ? toCloudFile(item) : null;
  }

  async listFiles(parent: CloudFolder<DropboxItemData>): Promise<CloudFile<DropboxItemData>[]> {
    return (await listFolder(itemPath(parent.data)))
      .filter(metadata => metadata['.tag'] === 'file')
      .map(toCloudFile);
  }

  async createFolder(
    parent: CloudFolder<DropboxItemData>,
    name: string,
    _purpose: CloudItemPurpose
  ): Promise<CloudFolder<DropboxItemData>> {
    const response = await dropboxRpcFetch('/files/create_folder_v2', {
      path: childPath(itemPath(parent.data), name),
      autorename: false,
    });
    const {metadata} = await readJson<DropboxCreateFolderResult>(response);
    // create_folder_v2 returns unambiguous FolderMetadata without the union '.tag'.
    return toCloudFolder({...metadata, '.tag': 'folder'});
  }

  async uploadFile({
    parent,
    name,
    blob,
    existing,
  }: UploadCloudFileRequest<DropboxItemData>): Promise<CloudFile<DropboxItemData>> {
    return toCloudFile(
      await uploadDropboxFile({
        path: existing ? itemPath(existing.data) : childPath(itemPath(parent.data), name),
        blob,
      })
    );
  }

  async downloadFile(file: CloudFile<DropboxItemData>): Promise<ArrayBuffer | null> {
    const response = await dropboxContentFetch('/files/download', {path: file.id}, undefined, {
      allowNotFound: true,
    });
    if (response.status === 409) {
      return null;
    }
    try {
      return await response.arrayBuffer();
    } catch (error) {
      throw CloudError.fromFetchError(error, 'Could not download Dropbox file');
    }
  }

  async deleteItem(item: CloudItem<DropboxItemData>): Promise<void> {
    await dropboxRpcFetch('/files/delete_v2', {path: item.id}, {allowNotFound: true});
  }

  async deleteAppData(_rootFolderId?: string, _permanent = false): Promise<void> {
    // Dropbox owns the outer app folder, so delete each immediate child instead.
    // Deleting a Dropbox folder recursively deletes everything inside it.
    for (const item of await listFolder('')) {
      await dropboxRpcFetch(
        '/files/delete_v2',
        {path: item.id ?? itemPath(item)},
        {allowNotFound: true}
      );
    }
  }
}

function dropboxAppRoot(): CloudFolder<DropboxItemData> {
  // Dropbox does not expose metadata for the API root, so represent it as a path-only folder.
  const data: DropboxItemData = {
    '.tag': 'folder',
    id: '',
    name: '',
    path_display: '',
  };
  return {
    id: '',
    name: '',
    kind: CloudItemKind.Folder,
    data,
  };
}

async function listFolder(path: string): Promise<DropboxItemData[]> {
  const files: DropboxItemData[] = [];
  let cursor: string | undefined;
  let hasMore: boolean;

  do {
    const response = cursor
      ? await dropboxRpcFetch('/files/list_folder/continue', {cursor})
      : await dropboxRpcFetch('/files/list_folder', {
          path,
          recursive: false,
          include_deleted: false,
          limit: 2000,
        });
    const page = await readJson<DropboxListFolderResult>(response);
    files.push(...(page.entries ?? []).filter(metadata => metadata['.tag'] !== 'deleted'));
    hasMore = page.has_more ?? false;
    cursor = page.cursor;
    if (hasMore && !cursor) {
      throw new Error('Dropbox list folder cursor is missing');
    }
  } while (hasMore);

  return files;
}

async function getMetadata(path: string): Promise<DropboxItemData | null> {
  const response = await dropboxRpcFetch('/files/get_metadata', {path}, {allowNotFound: true});
  if (response.status === 409) {
    return null;
  }
  return await readJson<DropboxItemData>(response);
}

async function uploadDropboxFile({path, blob}: UploadDropboxFileRequest): Promise<DropboxItemData> {
  const metadata =
    blob.size <= SIMPLE_UPLOAD_MAX_SIZE
      ? await uploadFileContents(path, blob)
      : await uploadFileWithSession(path, blob);
  // Upload endpoints return unambiguous FileMetadata without the union '.tag'.
  return {...metadata, '.tag': 'file'};
}

async function uploadFileContents(path: string, blob: Blob): Promise<DropboxItemData> {
  const response = await dropboxContentFetch('/files/upload', uploadCommit(path), blob);
  return await readJson<DropboxItemData>(response);
}

async function uploadFileWithSession(path: string, blob: Blob): Promise<DropboxItemData> {
  const firstChunk = blob.slice(0, UPLOAD_CHUNK_SIZE);
  const startResponse = await dropboxContentFetch(
    '/files/upload_session/start',
    {close: false},
    firstChunk
  );
  const {session_id: sessionId} = await readJson<DropboxUploadSessionStartResult>(startResponse);
  if (!sessionId) {
    throw new Error('Dropbox upload session ID is missing');
  }

  let offset = firstChunk.size;
  while (blob.size - offset > UPLOAD_CHUNK_SIZE) {
    const chunk = blob.slice(offset, offset + UPLOAD_CHUNK_SIZE);
    await dropboxContentFetch(
      '/files/upload_session/append_v2',
      {
        cursor: {
          session_id: sessionId,
          offset,
        },
        close: false,
      },
      chunk
    );
    offset += chunk.size;
  }

  const response = await dropboxContentFetch(
    '/files/upload_session/finish',
    {
      cursor: {
        session_id: sessionId,
        offset,
      },
      commit: uploadCommit(path),
    },
    blob.slice(offset)
  );
  return await readJson<DropboxItemData>(response);
}

async function dropboxRpcFetch(
  path: string,
  body: Record<string, unknown>,
  options?: DropboxFetchOptions
): Promise<Response> {
  return await dropboxFetch(
    `${DROPBOX_API}${path}`,
    {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(body),
    },
    options
  );
}

async function dropboxContentFetch(
  path: string,
  argument: Record<string, unknown>,
  body?: Blob,
  options?: DropboxFetchOptions
): Promise<Response> {
  return await dropboxFetch(
    `${DROPBOX_CONTENT_API}${path}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify(argument),
      },
      body,
      signal: AbortSignal.timeout(DROPBOX_FILE_TRANSFER_TIMEOUT_MS),
    },
    options
  );
}

interface DropboxFetchOptions {
  allowNotFound?: boolean;
  retryOnUnauthorized?: boolean;
}

async function dropboxFetch(
  input: RequestInfo | URL,
  init: RequestInit,
  {allowNotFound = false, retryOnUnauthorized = true}: DropboxFetchOptions = {}
): Promise<Response> {
  const {accessToken} = await getCloudAccessToken(CloudProvider.Dropbox);
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);
  let response: Response;
  try {
    response = await fetch(input, {
      ...init,
      cache: 'no-store',
      headers,
      signal: init.signal ?? AbortSignal.timeout(DROPBOX_REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw CloudError.fromFetchError(error, 'Could not access Dropbox');
  }
  if (response.status === 401) {
    clearCloudAccessToken(accessToken);
    if (retryOnUnauthorized) {
      console.warn('[cloud-sync] Dropbox access token rejected, retrying with a fresh token');
      return await dropboxFetch(input, init, {
        allowNotFound,
        retryOnUnauthorized: false,
      });
    }
    throw new CloudError(CloudErrorType.AuthorizationFailed, 'Dropbox authorization failed');
  }

  const errorResponse = !response.ok
    ? await safeReadJson<DropboxErrorResponse>(response.clone())
    : undefined;
  if (response.status === 409 && allowNotFound && isDropboxNotFound(errorResponse?.error_summary)) {
    return response;
  }
  if (response.status === 429) {
    throw new CloudError(CloudErrorType.RateLimited, 'Dropbox rate limit exceeded');
  }
  if (!response.ok) {
    let message = errorResponse?.error_summary;
    if (!message) {
      try {
        message = await response.text();
      } catch (error) {
        throw CloudError.fromFetchError(error, 'Could not access Dropbox');
      }
    }
    throw new Error(
      `Dropbox request failed (${response.status}): ${message || response.statusText}`
    );
  }
  return response;
}

function uploadCommit(path: string): Record<string, unknown> {
  return {
    path,
    mode: 'overwrite',
    autorename: false,
    mute: true,
    strict_conflict: false,
  };
}

function childPath(parentPath: string, name: string): string {
  return parentPath ? `${parentPath}/${name}` : `/${name}`;
}

function isDropboxNotFound(errorSummary: string | undefined): boolean {
  return errorSummary?.split('/').includes('not_found') ?? false;
}

function itemPath(data: DropboxItemData): string {
  const path = data.path_display ?? data.path_lower;
  if (path === undefined) {
    throw new Error('Dropbox item path is missing');
  }
  return path;
}

function toCloudFolder(data: DropboxItemData): CloudFolder<DropboxItemData> {
  if (data['.tag'] !== 'folder') {
    throw new Error(`Dropbox item is not a folder: ${data.id ?? data.name}`);
  }
  if (!data.id) {
    throw new Error(`Dropbox folder ID is missing: ${data.name}`);
  }
  itemPath(data);
  return {
    id: data.id,
    name: data.name,
    kind: CloudItemKind.Folder,
    data,
  };
}

function toCloudFile(data: DropboxItemData): CloudFile<DropboxItemData> {
  if (data['.tag'] !== 'file') {
    throw new Error(`Dropbox item is not a file: ${data.id ?? data.name}`);
  }
  if (!data.id) {
    throw new Error(`Dropbox file ID is missing: ${data.name}`);
  }
  itemPath(data);
  if (!data.rev) {
    throw new Error(`Dropbox file revision is missing: ${data.id}`);
  }
  if (!data.server_modified) {
    throw new Error(`Dropbox file modification time is missing: ${data.id}`);
  }
  const modifiedAt = new Date(data.server_modified);
  if (Number.isNaN(modifiedAt.getTime())) {
    throw new Error(`Dropbox file modification time is invalid: ${data.id}`);
  }
  return {
    id: data.id,
    name: data.name,
    kind: CloudItemKind.File,
    revision: data.rev,
    modifiedAt,
    data,
  };
}
