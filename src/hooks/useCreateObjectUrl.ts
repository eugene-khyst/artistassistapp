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

import {useMemo, useSyncExternalStore} from 'react';

interface ObjectUrlStore {
  subscribe: (onStoreChange: () => void) => () => void;
  getSnapshot: () => string | undefined;
  getServerSnapshot: () => undefined;
}

function createObjectUrlStore(blob?: Blob | null): ObjectUrlStore {
  let url: string | undefined;
  let subscriberCount = 0;

  return {
    subscribe: onStoreChange => {
      subscriberCount++;
      if (blob && !url) {
        url = URL.createObjectURL(blob);
      }
      onStoreChange();
      return () => {
        subscriberCount--;
        if (url && subscriberCount === 0) {
          URL.revokeObjectURL(url);
          url = undefined;
        }
      };
    },
    getSnapshot: () => url,
    getServerSnapshot: () => undefined,
  };
}

export function useCreateObjectUrl(blob?: Blob | null): string | undefined {
  const store = useMemo(() => createObjectUrlStore(blob), [blob]);
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}
