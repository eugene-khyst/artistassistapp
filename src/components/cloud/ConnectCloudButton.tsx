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

interface ConnectCloudButtonProps {
  provider: CloudProvider;
}

export function ConnectCloudButton({provider}: Readonly<ConnectCloudButtonProps>) {
  const user = useAppStore(state => state.auth?.user);
  const connectedProvider = useAppStore(state => state.cloudConnection?.provider);
  const cloudOperation = useAppStore(state => state.cloudOperation);
  const startCloudConnection = useAppStore(state => state.connectCloud);

  if (!user || connectedProvider) {
    return null;
  }

  const label = CLOUD_PROVIDER_LABELS[provider];
  const isConnecting =
    cloudOperation?.type === CloudOperationType.Connect && cloudOperation.provider === provider;

  return (
    <Popconfirm
      title={<Trans>Connect {label}?</Trans>}
      description={
        provider === CloudProvider.Google ? (
          <Trans>
            Your color sets, reference photos, mixtures, and custom color brands will be saved in
            the ArtistAssistApp folder in My Drive and kept synchronized across your devices.
            <br />
            ArtistAssistApp works only with this app-created folder and the files it creates there.
            <br />
            It cannot access your other Drive files or shared drives.
          </Trans>
        ) : (
          <Trans>
            Your color sets, reference photos, mixtures, and custom color brands will be saved in
            the ArtistAssistApp folder in {label} and kept synchronized across your devices.
            <br />
            ArtistAssistApp can access that app folder, including files you put there, but cannot
            access files outside it.
          </Trans>
        )
      }
      zIndex={2100}
      onConfirm={() => void startCloudConnection(provider)}
      okText={<Trans>Connect</Trans>}
      cancelText={<Trans>Cancel</Trans>}
    >
      <Button type="primary" loading={isConnecting} disabled={!!cloudOperation && !isConnecting}>
        <Trans>Connect {label}</Trans>
      </Button>
    </Popconfirm>
  );
}
