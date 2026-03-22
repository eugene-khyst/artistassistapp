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

import {useCallback, useState} from 'react';

import {InstallDrawer} from '~/src/components/install/InstallDrawer';
import {useAppStore} from '~/src/stores/app-store';

interface Result {
  install: () => void;
  installDrawer: React.ReactNode;
}

export function useInstall(): Result {
  const beforeInstallPromptEvent = useAppStore(state => state.beforeInstallPromptEvent);
  const setBeforeInstallPromptEvent = useAppStore(state => state.setBeforeInstallPromptEvent);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const install = useCallback(() => {
    if (beforeInstallPromptEvent) {
      void beforeInstallPromptEvent.prompt();
      void beforeInstallPromptEvent.userChoice.then(() => {
        setBeforeInstallPromptEvent(null);
      });
    } else {
      setIsDrawerOpen(true);
    }
  }, [beforeInstallPromptEvent, setBeforeInstallPromptEvent]);

  const installDrawer = (
    <InstallDrawer
      open={isDrawerOpen}
      onClose={() => {
        setIsDrawerOpen(false);
      }}
    />
  );

  return {install, installDrawer};
}
