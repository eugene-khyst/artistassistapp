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
  ColorMixture,
  ColorSetDefinition,
  CustomColorBrandSource,
} from '@/services/color/types';
import type {StoreChangeTokens} from '@/services/db/types';
import type {ImageFile, ImageMetadata} from '@/services/image/image-file';

export enum CloudProvider {
  Google = 'google',
  Microsoft = 'microsoft',
  Dropbox = 'dropbox',
}

export interface CloudAccessToken {
  provider: CloudProvider;
  accessToken: string;
  expiresAt: Date;
}

export interface CloudConnectionAttempt {
  verifier: string;
}

export interface CloudConnection {
  id: string;
  provider: CloudProvider;
}

export interface CloudSync {
  connectionId: string;
  lastSyncedAt?: Date;
  lastSyncedRev?: string;
  remoteItems: CloudRemoteItems;
}

export interface CloudRemoteItems {
  rootFolderId: string;
  stateFileId: string;
}

export interface LocalStateConnection {
  connectionId: string;
  stateHash: string;
  userId: string;
}

export type CloudCustomBrand = CustomColorBrandSource;
export type CloudColorSet = Omit<ColorSetDefinition, 'date'>;
export type CloudImage = ImageMetadata;
export type CloudColorMixture = Omit<ColorMixture, 'date' | 'layerRho'> & {
  layerRho: number[];
};

export type CustomColorBrandJson = Omit<CustomColorBrandSource, 'id'>;

export interface CloudState {
  customBrands: CloudCustomBrand[];
  colorSets: CloudColorSet[];
  images: CloudImage[];
  colorMixtures: CloudColorMixture[];
}

export enum CloudSyncType {
  Unchanged = 'unchanged',
  Upload = 'upload',
  Download = 'download',
}

export type CloudSyncResult = {
  storeChangeTokens?: StoreChangeTokens;
} & (
  | {
      type: CloudSyncType.Unchanged;
      cloudSync?: CloudSync;
      stateHash?: string;
    }
  | {
      type: CloudSyncType.Upload;
      cloudSync: CloudSync;
      stateHash: string;
    }
  | {
      type: CloudSyncType.Download;
      cloudSync: CloudSync;
      stateHash: string;
      remoteState: CloudState;
      remoteImages: ImageFile[];
    }
);

export interface CloudSyncProgress {
  type: CloudSyncType.Upload | CloudSyncType.Download;
  index: number;
  count: number;
}

export interface CloudSyncOptions {
  signal?: AbortSignal;
  onProgress?: (progress: CloudSyncProgress) => void;
}

export interface CloudSyncContext extends CloudSyncOptions {
  recreateDeletedRemoteItems: boolean;
  cloudConnection: CloudConnection;
  userId: string;
  localStateConnection?: LocalStateConnection;
  connectionCloudSync?: CloudSync;
  localState: CloudState;
  localStateJson: string;
  localStateHash: string;
  localStateIsEmpty: boolean;
}

export interface CloudSyncClient {
  sync(context: CloudSyncContext): Promise<CloudSyncResult>;
  push(context: CloudSyncContext): Promise<CloudSyncResult>;
  upload(context: CloudSyncContext): Promise<CloudSyncResult>;
  download(context: CloudSyncContext): Promise<CloudSyncResult>;
  hasCloudDataChanged(
    cloudSync: CloudSync,
    localStateConnection: LocalStateConnection
  ): Promise<boolean>;
  deleteCloudData(cloudSync?: CloudSync, permanent?: boolean): Promise<void>;
}

export enum FileExtension {
  State = '.artistassist',
  CustomColorBrand = '.clrb',
}

export const EMPTY_CLOUD_STATE: CloudState = {
  customBrands: [],
  colorSets: [],
  images: [],
  colorMixtures: [],
};
