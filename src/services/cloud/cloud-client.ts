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

export enum CloudItemKind {
  File = 'file',
  Folder = 'folder',
}

export enum CloudItemPurpose {
  RootFolder = 'root-folder',
  ImagesFolder = 'images-folder',
  Image = 'image',
  SyncState = 'sync-state',
}

interface CloudItemBase<T> {
  id: string;
  name: string;
  data: T;
}

export interface CloudFolder<T> extends CloudItemBase<T> {
  kind: CloudItemKind.Folder;
}

export interface CloudFile<T> extends CloudItemBase<T> {
  kind: CloudItemKind.File;
  contentDigest?: string;
  revision: string;
  modifiedAt: Date;
}

export type CloudItem<T> = CloudFile<T> | CloudFolder<T>;

export interface UploadCloudFileRequest<T> {
  parent: CloudFolder<T>;
  name: string;
  blob: Blob;
  existing?: CloudFile<T>;
  purpose?: CloudItemPurpose;
  contentDigest?: string;
}

export interface CloudClient<T> {
  findAppRoot(): Promise<CloudFolder<T> | null>;
  createAppRoot(): Promise<CloudFolder<T>>;
  // Id-addressed fast path used to preserve user renames within the expected parent folder.
  getFileById?(id: string, parentId?: string): Promise<CloudFile<T> | null>;
  getFolderById?(id: string): Promise<CloudFolder<T> | null>;
  findFolder(
    parent: CloudFolder<T>,
    name: string,
    purpose: CloudItemPurpose
  ): Promise<CloudFolder<T> | null>;
  findFile(
    parent: CloudFolder<T>,
    name: string,
    purpose: CloudItemPurpose
  ): Promise<CloudFile<T> | null>;
  listFiles(parent: CloudFolder<T>, purpose?: CloudItemPurpose): Promise<CloudFile<T>[]>;
  createFolder(
    parent: CloudFolder<T>,
    name: string,
    purpose: CloudItemPurpose
  ): Promise<CloudFolder<T>>;
  uploadFile(request: UploadCloudFileRequest<T>): Promise<CloudFile<T>>;
  downloadFile(file: CloudFile<T>): Promise<ArrayBuffer | null>;
  deleteItem(item: CloudItem<T>): Promise<void>;
  deleteAppData(rootFolderId?: string, permanent?: boolean): Promise<void>;
}
