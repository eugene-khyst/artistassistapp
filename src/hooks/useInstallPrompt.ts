/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {useCallback, useEffect, useState} from 'react';

import type {BeforeInstallPromptEvent} from '~/src/pwa';
import {useAppStore} from '~/src/stores/app-store';
import {TabKey} from '~/src/types';

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
