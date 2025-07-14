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

import {useCallback} from 'react';

import {useAppStore} from '~/src/stores/app-store';
import {TabKey} from '~/src/tabs';

interface Result {
  showInstallPromotion: boolean;
  promptToInstall: () => Promise<void>;
}

export function useInstallPrompt(): Result {
  const beforeInstallPromptEvent = useAppStore(state => state.beforeInstallPromptEvent);

  const setBeforeInstallPromptEvent = useAppStore(state => state.setBeforeInstallPromptEvent);
  const setActiveTabKey = useAppStore(state => state.setActiveTabKey);

  const showInstallPromotion = !!beforeInstallPromptEvent;

  const promptToInstall = useCallback(async () => {
    if (!beforeInstallPromptEvent) {
      return;
    }
    void beforeInstallPromptEvent.prompt();
    const {outcome} = await beforeInstallPromptEvent.userChoice;
    if (outcome === 'accepted') {
      void setActiveTabKey(TabKey.ColorSet);
    }
    setBeforeInstallPromptEvent(null);
  }, [setBeforeInstallPromptEvent, setActiveTabKey, beforeInstallPromptEvent]);

  return {
    showInstallPromotion,
    promptToInstall,
  };
}
