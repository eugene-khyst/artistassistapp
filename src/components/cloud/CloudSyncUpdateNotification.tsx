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

import {Trans} from '@lingui/react/macro';
import {App, Button, Space} from 'antd';
import {useEffect} from 'react';

import {SyncCloudButton} from '@/components/cloud/SyncCloudButton';
import {useAppStore} from '@/stores/app-store';

const NOTIFICATION_KEY = 'cloud-sync-update';

export function CloudSyncUpdateNotification() {
  const cloudSyncUpdateAvailable = useAppStore(state => state.cloudSyncUpdateAvailable);
  const dismissCloudSyncUpdate = useAppStore(state => state.dismissCloudSyncUpdate);

  const {notification} = App.useApp();

  useEffect(() => {
    if (!cloudSyncUpdateAvailable) {
      notification.destroy(NOTIFICATION_KEY);
      return;
    }
    notification.open({
      key: NOTIFICATION_KEY,
      title: <Trans>Cloud data changed</Trans>,
      description: <Trans>Your cloud data changed and will be synchronized automatically.</Trans>,
      placement: 'top',
      duration: 10,
      showProgress: true,
      closeIcon: null,
      onClose: () => {
        const state = useAppStore.getState();
        if (state.cloudSyncUpdateAvailable) {
          void state.syncCloudState();
        }
      },
      actions: (
        <Space>
          <Button onClick={dismissCloudSyncUpdate}>
            <Trans>Postpone</Trans>
          </Button>
          <SyncCloudButton type="primary" />
        </Space>
      ),
    });
  }, [cloudSyncUpdateAvailable, dismissCloudSyncUpdate, notification]);

  return null;
}
