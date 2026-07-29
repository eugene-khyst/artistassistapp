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

import {UserDeleteOutlined} from '@ant-design/icons';
import {Trans} from '@lingui/react/macro';
import {Button, Popconfirm} from 'antd';

import {CloudProvider} from '@/services/cloud/types';
import {useAppStore} from '@/stores/app-store';

export function DeleteAccountButton() {
  const user = useAppStore(state => state.auth?.user);
  const cloudProvider = useAppStore(state => state.cloudConnection?.provider);
  const isAccountDeleting = useAppStore(state => state.isAccountDeleting);
  const deleteAccount = useAppStore(state => state.deleteAccount);

  if (!user) {
    return null;
  }

  const cloudDataDeletionDescription =
    cloudProvider === CloudProvider.Google ? (
      <Trans>
        This permanently deletes the ArtistAssistApp folder and all your files and folders still
        inside it. Files you moved outside the folder are not deleted.
      </Trans>
    ) : cloudProvider ? (
      <Trans>
        This deletes everything inside the connected cloud app folder, including files you added.
      </Trans>
    ) : null;

  const accountDeletionDescription = cloudProvider ? (
    <Trans>
      It also disconnects cloud storage, deletes your account and membership lookup records, and
      logs you out.
    </Trans>
  ) : (
    <Trans>This deletes your account and membership lookup records and logs you out.</Trans>
  );

  return (
    <Popconfirm
      title={<Trans>Delete data on servers</Trans>}
      description={
        <div>
          {cloudDataDeletionDescription && <div>{cloudDataDeletionDescription}</div>}
          <div>{accountDeletionDescription}</div>
        </div>
      }
      onConfirm={() => void deleteAccount()}
      okText={<Trans>Delete</Trans>}
      cancelText={<Trans>Cancel</Trans>}
    >
      <Button icon={<UserDeleteOutlined />} danger loading={isAccountDeleting}>
        <Trans>Delete data on servers</Trans>
      </Button>
    </Popconfirm>
  );
}
