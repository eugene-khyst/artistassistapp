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

import {DeleteOutlined} from '@ant-design/icons';
import {Trans} from '@lingui/react/macro';
import {Button, Popconfirm} from 'antd';
import {useState} from 'react';

import {deleteAppData} from '@/utils/storage';

export function DeleteAppDataButton() {
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const handleDeleteData = async () => {
    try {
      setIsDeleting(true);
      await deleteAppData();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Popconfirm
      title={<Trans>Delete data on this device</Trans>}
      description={
        <Trans>
          ArtistAssistApp will permanently delete your saved work and settings from this device and
          log you out.
          <br />
          Data already synced to cloud storage will not be deleted.
        </Trans>
      }
      onConfirm={() => void handleDeleteData()}
      okText={<Trans>Delete</Trans>}
      cancelText={<Trans>Cancel</Trans>}
    >
      <Button icon={<DeleteOutlined />} danger loading={isDeleting}>
        <Trans>Delete data on this device</Trans>
      </Button>
    </Popconfirm>
  );
}
