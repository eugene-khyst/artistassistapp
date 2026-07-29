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

import type {DBSchema, StoreNames} from 'idb';

import type {AuthAttempt, AuthSession} from '@/services/auth/types';
import type {
  CloudConnection,
  CloudConnectionAttempt,
  CloudSync,
  LocalStateConnection,
} from '@/services/cloud/types';
import type {
  ColorMixture,
  ColorSetDefinition,
  ColorType,
  CustomColorBrandDefinition,
} from '@/services/color/types';
import type {AppliedMigration} from '@/services/db/migrations';
import type {StoreChangeName} from '@/services/db/types';
import type {ImageFile, ImageMetadata} from '@/services/image/image-file';
import type {AppSettings} from '@/services/settings/types';

export interface ArtistAssistAppDB extends DBSchema {
  migrations: {
    value: AppliedMigration;
    key: number;
    indexes: {
      'by-name': string;
    };
  };
  'store-changes': {
    value: string;
    key: StoreChangeName;
  };
  'app-settings': {
    value: AppSettings;
    key: number;
  };
  'color-sets': {
    value: ColorSetDefinition;
    key: number;
  };
  images: {
    value: ImageFile;
    key: number;
    indexes: {
      'by-date': Date;
      'by-digest': string;
    };
  };
  'image-metadata': {
    value: ImageMetadata;
    key: string;
  };
  'style-image': {
    value: ImageFile;
    key: number;
  };
  'color-mixtures': {
    value: ColorMixture;
    key: number;
    indexes: {
      'by-imageFileDigest': string;
    };
  };
  'custom-brands': {
    value: CustomColorBrandDefinition;
    key: number;
    indexes: {
      'by-type': ColorType;
    };
  };
  'auth-attempt': {
    value: AuthAttempt;
    key: number;
  };
  'auth-session': {
    value: AuthSession;
    key: number;
  };
  'cloud-connection-attempt': {
    value: CloudConnectionAttempt;
    key: number;
  };
  'cloud-connection': {
    value: CloudConnection;
    key: number;
  };
  'cloud-sync': {
    value: CloudSync;
    key: string;
  };
  'local-state-connection': {
    value: LocalStateConnection;
    key: number;
  };
}

const OBJECT_STORES = {
  migrations: true,
  'store-changes': true,
  'app-settings': true,
  'color-sets': true,
  images: true,
  'image-metadata': true,
  'style-image': true,
  'color-mixtures': true,
  'custom-brands': true,
  'auth-attempt': true,
  'auth-session': true,
  'cloud-connection-attempt': true,
  'cloud-connection': true,
  'cloud-sync': true,
  'local-state-connection': true,
} as const satisfies Record<StoreNames<ArtistAssistAppDB>, true>;

export type StoreName = keyof typeof OBJECT_STORES;

export const OBJECT_STORE_NAMES = Object.keys(OBJECT_STORES) as StoreName[];
