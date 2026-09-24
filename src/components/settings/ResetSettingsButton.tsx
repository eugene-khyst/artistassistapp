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

import {UndoOutlined} from '@ant-design/icons';
import {Trans} from '@lingui/react/macro';
import {Button, Popconfirm} from 'antd';
import {useState} from 'react';

import {DEFAULT_APP_SETTINGS} from '@/services/settings/types';
import {useAppStore} from '@/stores/app-store';

export function ResetSettingsButton() {
  const saveAppSettings = useAppStore(state => state.saveAppSettings);
  const saveCustomStyleImage = useAppStore(state => state.saveCustomStyleImage);

  const [isResetting, setIsResetting] = useState<boolean>(false);

  const handleResetSettings = async () => {
    try {
      setIsResetting(true);
      await saveCustomStyleImage(null);
      await saveAppSettings(() => DEFAULT_APP_SETTINGS);
      window.location.reload();
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Popconfirm
      title={<Trans>Reset settings</Trans>}
      description={
        <Trans>Your app settings will return to their defaults. Your saved work will remain.</Trans>
      }
      onConfirm={() => {
        void handleResetSettings();
      }}
      okText={<Trans>Reset</Trans>}
      cancelText={<Trans>Cancel</Trans>}
    >
      <Button icon={<UndoOutlined />} loading={isResetting}>
        <Trans>Reset settings</Trans>
      </Button>
    </Popconfirm>
  );
}
