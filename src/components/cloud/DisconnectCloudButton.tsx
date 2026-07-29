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
import {Button, Popconfirm} from 'antd';

import {CLOUD_PROVIDER_LABELS} from '@/components/messages';
import {CloudProvider} from '@/services/cloud/types';
import {useAppStore} from '@/stores/app-store';
import {CloudOperationType} from '@/stores/cloud-slice';

export function DisconnectCloudButton() {
  const provider = useAppStore(state => state.cloudConnection?.provider);
  const cloudOperation = useAppStore(state => state.cloudOperation);
  const disconnectCloud = useAppStore(state => state.disconnectCloud);

  if (!provider) {
    return null;
  }

  const label = CLOUD_PROVIDER_LABELS[provider];
  const isDisconnecting = cloudOperation?.type === CloudOperationType.Disconnect;

  return (
    <Popconfirm
      title={<Trans>Disconnect {label}?</Trans>}
      description={
        provider === CloudProvider.Google ? (
          <Trans>
            Disconnecting moves the ArtistAssistApp folder and everything still inside it to Google
            Drive Trash.
            <br />
            Files you moved outside the folder are not deleted.
          </Trans>
        ) : (
          <Trans>
            Disconnecting will delete everything inside the ArtistAssistApp app folder, including
            files you added.
            <br />
            Move anything you want to keep outside the folder first.
            <br />
            Files outside the folder will not be deleted.
            <br />
            Depending on the provider, deletion may be permanent.
          </Trans>
        )
      }
      onConfirm={() => void disconnectCloud()}
      okText={<Trans>Disconnect</Trans>}
      cancelText={<Trans>Cancel</Trans>}
    >
      <Button loading={isDisconnecting} disabled={!!cloudOperation && !isDisconnecting}>
        <Trans>Disconnect {label}</Trans>
      </Button>
    </Popconfirm>
  );
}
