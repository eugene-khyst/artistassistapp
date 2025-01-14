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

import {useCallback, useEffect, useState} from 'react';

import type {BeforeInstallPromptEvent} from '~/src/pwa';
import {useAppStore} from '~/src/stores/app-store';
import {TabKey} from '~/src/tabs';

interface Result {
  showInstallPromotion: boolean;
  promptToInstall: () => Promise<void>;
}

export function useInstallPrompt(): Result {
  const setActiveTabKey = useAppStore(state => state.setActiveTabKey);

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent>();
  const [showInstallPromotion, setShowInstallPromotion] = useState<boolean>(false);

  useEffect(() => {
    const beforeInstallPromptListener = (prompt: BeforeInstallPromptEvent) => {
      prompt.preventDefault();
      setDeferredPrompt(prompt);
      setShowInstallPromotion(true);
    };
    const appInstalledListener = () => {
      setShowInstallPromotion(false);
      setDeferredPrompt(undefined);
    };
    window.addEventListener('beforeinstallprompt', beforeInstallPromptListener);
    window.addEventListener('appinstalled', appInstalledListener);
    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstallPromptListener);
      window.removeEventListener('appinstalled', appInstalledListener);
    };
  }, []);

  const promptToInstall = useCallback(async () => {
    if (!deferredPrompt) {
      return;
    }
    setShowInstallPromotion(false);
    void deferredPrompt.prompt();
    const {outcome} = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      void setActiveTabKey(TabKey.ColorSet);
    }
    setDeferredPrompt(undefined);
  }, [deferredPrompt, setActiveTabKey]);

  return {
    showInstallPromotion,
    promptToInstall,
  };
}
