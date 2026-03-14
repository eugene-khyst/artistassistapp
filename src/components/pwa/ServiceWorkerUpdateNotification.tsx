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

import {Trans} from '@lingui/react/macro';
import {App, Button, Space} from 'antd';
import {useEffect} from 'react';

import {useAppStore} from '~/src/stores/app-store';

const NOTIFICATION_KEY = 'sw-update';

export const ServiceWorkerUpdateNotification: React.FC = () => {
  const serviceWorkerRegistration = useAppStore(state => state.serviceWorkerRegistration);
  const serviceWorkerUpdatePostponed = useAppStore(state => state.serviceWorkerUpdatePostponed);
  const updateServiceWorker = useAppStore(state => state.updateServiceWorker);
  const postponeServiceWorkerUpdate = useAppStore(state => state.postponeServiceWorkerUpdate);

  const {notification} = App.useApp();

  const open = !!serviceWorkerRegistration && !serviceWorkerUpdatePostponed;

  useEffect(() => {
    if (!open) {
      notification.destroy(NOTIFICATION_KEY);
      return;
    }
    notification.open({
      key: NOTIFICATION_KEY,
      message: <Trans>Update available</Trans>,
      description: (
        <Trans>A new version of the app is available and will be installed automatically.</Trans>
      ),
      placement: 'top',
      duration: 10,
      showProgress: true,
      closeIcon: null,
      onClose: () => {
        if (!useAppStore.getState().serviceWorkerUpdatePostponed) {
          updateServiceWorker();
        }
      },
      actions: (
        <Space>
          <Button type="primary" onClick={updateServiceWorker}>
            <Trans>Update now</Trans>
          </Button>
          <Button onClick={postponeServiceWorkerUpdate}>
            <Trans>Postpone</Trans>
          </Button>
        </Space>
      ),
    });
  }, [open, notification, updateServiceWorker, postponeServiceWorkerUpdate]);

  return null;
};
