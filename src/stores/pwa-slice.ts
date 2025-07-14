/**
 * ArtistAssistApp
 * Copyright (C) 2023-2025  Eugene Khyst
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

import type {StateCreator} from 'zustand';

import type {BeforeInstallPromptEvent} from '~/src/pwa';

export interface PwaSlice {
  beforeInstallPromptEvent: BeforeInstallPromptEvent | null;

  setBeforeInstallPromptEvent: (beforeInstallPromptEvent: BeforeInstallPromptEvent | null) => void;
}

export const createPwaSlice: StateCreator<PwaSlice, [], [], PwaSlice> = set => ({
  beforeInstallPromptEvent: null,

  setBeforeInstallPromptEvent: (
    beforeInstallPromptEvent: BeforeInstallPromptEvent | null
  ): void => {
    set({beforeInstallPromptEvent});
  },
});
