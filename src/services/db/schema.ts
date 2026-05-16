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

import type {
  ColorMixture,
  ColorSetDefinition,
  ColorType,
  CustomColorBrandDefinition,
} from '~/src/services/color/types';
import type {AuthErrorData} from '~/src/services/db/auth-db';
import type {AppliedMigration} from '~/src/services/db/migrations';
import type {ImageFile} from '~/src/services/image/image-file';
import type {AppSettings} from '~/src/services/settings/types';

export interface ArtistAssistAppDB extends DBSchema {
  migrations: {
    value: AppliedMigration;
    key: number;
    indexes: {
      'by-name': string;
    };
  };
  'app-settings': {
    value: AppSettings;
    key: number;
  };
  'color-sets': {
    value: ColorSetDefinition;
    key: number;
    indexes: {
      'by-date': Date;
      'by-type': ColorType;
    };
  };
  images: {
    value: ImageFile;
    key: number;
    indexes: {
      'by-date': Date;
      'by-digest': string;
    };
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
      'by-date': Date;
      'by-type': ColorType;
    };
  };
  'auth-error': {
    value: AuthErrorData;
    key: number;
  };
  'id-token': {
    value: string;
    key: number;
  };
}

const OBJECT_STORES = {
  migrations: true,
  'app-settings': true,
  'color-sets': true,
  images: true,
  'color-mixtures': true,
  'custom-brands': true,
  'auth-error': true,
  'id-token': true,
} as const satisfies Record<StoreNames<ArtistAssistAppDB>, true>;

export type StoreName = keyof typeof OBJECT_STORES;

export const OBJECT_STORE_NAMES = Object.keys(OBJECT_STORES) as StoreName[];
