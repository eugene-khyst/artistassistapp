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

import {useLingui} from '@lingui/react/macro';
import {App, Flex} from 'antd';
import {createElement, useCallback} from 'react';

import {ConnectCloudButton} from '@/components/cloud/ConnectCloudButton';
import {ExportToZipButton} from '@/components/cloud/ExportToZipButton';
import {CloudProvider} from '@/services/cloud/types';
import {useAppStore} from '@/stores/app-store';

export const STORAGE_NOTIFICATION_KEY = 'storage-protection';

export function useCloudSyncNotification(): () => void {
  const {notification} = App.useApp();
  const {t} = useLingui();
  const user = useAppStore(state => state.auth?.user);
  const cloudConnection = useAppStore(state => state.cloudConnection);

  return useCallback(() => {
    if (!user || cloudConnection) {
      notification.destroy(STORAGE_NOTIFICATION_KEY);
      return;
    }

    notification.info({
      key: STORAGE_NOTIFICATION_KEY,
      title: t`Cloud sync is not enabled`,
      description: t`Connect cloud storage to keep a synchronized copy of your data in the cloud and use it across devices, or manually save and restore backup files.`,
      placement: 'top',
      duration: 10,
      showProgress: true,
      actions: createElement(
        Flex,
        {gap: 'small', wrap: true, justify: 'flex-end'},
        createElement(ConnectCloudButton, {provider: CloudProvider.Google}),
        createElement(ConnectCloudButton, {provider: CloudProvider.Microsoft}),
        createElement(ConnectCloudButton, {provider: CloudProvider.Dropbox}),
        createElement(ExportToZipButton)
      ),
    });
  }, [cloudConnection, notification, t, user]);
}
