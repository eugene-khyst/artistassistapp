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

import {useCallback, useEffect, useMemo, useState} from 'react';

import {useAccessTo} from '@/hooks/useAccessTo';
import {type Access} from '@/services/auth/types';
import {type CatalogItem, compareByPriority, getDefaultItem} from '@/services/catalog';
import type {AppSettings} from '@/services/settings/types';
import {useAppStore} from '@/stores/app-store';

type SettingsKey = keyof Pick<
  AppSettings,
  'outlineModel' | 'styleTransferImageId' | 'backgroundRemovalModel' | 'colorizeModel'
>;

interface Options<T> {
  items?: Map<string, T>;
  settingsKey: SettingsKey;
  setItem: (item?: T) => void | Promise<void>;
  defaultPredicate?: (item: T) => boolean;
}

interface SelectedItem<T> {
  sortedItems: T[];
  defaultItem?: T;
  itemId?: string;
  item?: T;
  access: Access;
  // null = explicit cancel; undefined = use default.
  selectedItemId: string | null | undefined;
  selectItem: (id: string) => void;
  setSelectedItemId: (id: string | null | undefined) => void;
}

export function useSelectedCatalogItem<T extends CatalogItem>({
  items,
  settingsKey,
  setItem,
  defaultPredicate,
}: Options<T>): SelectedItem<T> {
  const user = useAppStore(state => state.auth?.user);
  const isAuthLoading = useAppStore(state => state.isAuthLoading);
  const persistedItemId = useAppStore(state => state.appSettings[settingsKey]);
  const saveAppSettings = useAppStore(state => state.saveAppSettings);

  const [selectedItemId, setSelectedItemId] = useState<string | null>();

  const sortedItems = useMemo<T[]>(
    () => [...(items?.values() ?? [])].sort(compareByPriority),
    [items]
  );

  const defaultItem = useMemo<T | undefined>(() => {
    if (isAuthLoading || !items?.size) {
      return;
    }
    const persisted = persistedItemId ? items.get(persistedItemId) : undefined;
    return persisted ?? getDefaultItem(items, user, defaultPredicate);
  }, [persistedItemId, items, user, defaultPredicate, isAuthLoading]);

  const itemId = selectedItemId === null ? undefined : (selectedItemId ?? defaultItem?.id);
  const item: T | undefined = itemId ? items?.get(itemId) : undefined;
  const access = useAccessTo(item);

  useEffect(() => {
    if (isAuthLoading || !items?.size) {
      return;
    }
    void setItem(itemId ? items.get(itemId) : undefined);
  }, [itemId, items, setItem, isAuthLoading]);

  const selectItem = useCallback(
    (id: string) => {
      setSelectedItemId(id);
      void saveAppSettings({[settingsKey]: id});
    },
    [saveAppSettings, settingsKey]
  );

  return {
    sortedItems,
    defaultItem,
    itemId,
    item,
    access,
    selectedItemId,
    selectItem,
    setSelectedItemId,
  };
}
