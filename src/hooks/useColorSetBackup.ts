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

import {defineMessage} from '@lingui/core/macro';
import {useLingui} from '@lingui/react/macro';
import {App} from 'antd';
import {useCallback} from 'react';

import {useAppStore} from '~/src/stores/app-store';

const backupMessage = defineMessage`Downloaded file {filename}`;
const backupDescription = defineMessage`This backup file lets you restore your color sets later, so keep it. You can delete any older backup files.`;

export function useColorSetBackup() {
  const saveColorSetsAsJson = useAppStore(state => state.saveColorSetsAsJson);
  const {notification} = App.useApp();
  const {i18n} = useLingui();

  return useCallback(async () => {
    const filename = await saveColorSetsAsJson();
    if (!filename) {
      return;
    }
    notification.info({
      message: i18n._(backupMessage.id, {filename}),
      description: i18n._(backupDescription.id),
      placement: 'topLeft',
      duration: 10,
      showProgress: true,
    });
  }, [saveColorSetsAsJson, notification, i18n]);
}
