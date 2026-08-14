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

import {AppstoreAddOutlined} from '@ant-design/icons';
import {Trans} from '@lingui/react/macro';
import {App, Button} from 'antd';
import {type ReactNode, useCallback} from 'react';

import {STORAGE_NOTIFICATION_KEY, useCloudSyncNotification} from '@/hooks/useCloudSyncNotification';
import {useDisplayMode} from '@/hooks/useDisplayMode';
import {useInstall} from '@/hooks/useInstall';
import {DisplayMode} from '@/utils/environment';
import {requestPersistentStorage} from '@/utils/storage';

interface Result {
  requestPersistentStorage: () => Promise<boolean>;
  showStorageNotification: (persistentStorageGranted: boolean) => void;
  installDrawer: ReactNode;
}

export function usePersistentStorage(): Result {
  const {notification} = App.useApp();
  const {install, installDrawer} = useInstall();
  const displayMode = useDisplayMode();
  const showCloudSyncNotification = useCloudSyncNotification();

  const showStorageNotification = useCallback(
    (persistentStorageGranted: boolean) => {
      if (!persistentStorageGranted && displayMode === DisplayMode.BROWSER) {
        const handleInstallClick = () => {
          notification.destroy(STORAGE_NOTIFICATION_KEY);
          install();
        };

        notification.warning({
          key: STORAGE_NOTIFICATION_KEY,
          title: <Trans>Persistent storage is not enabled</Trans>,
          description: (
            <Trans>
              Your data may not be saved reliably if the browser is closed. To fix this, install the
              app.
            </Trans>
          ),
          placement: 'top',
          duration: 10,
          showProgress: true,
          actions: (
            <Button type="primary" icon={<AppstoreAddOutlined />} onClick={handleInstallClick}>
              <Trans>Install</Trans>
            </Button>
          ),
        });
        return;
      }
      showCloudSyncNotification();
    },
    [displayMode, install, notification, showCloudSyncNotification]
  );

  return {requestPersistentStorage, showStorageNotification, installDrawer};
}
