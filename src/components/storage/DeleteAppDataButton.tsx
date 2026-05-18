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
import {Trans, useLingui} from '@lingui/react/macro';
import {Button, Popconfirm} from 'antd';
import {useState} from 'react';

import {deleteAppData} from '~/src/utils/storage';

export function DeleteAppDataButton() {
  const {t} = useLingui();

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
      title={t`Delete all app data`}
      description={t`Are you sure you want to delete all app data?`}
      onConfirm={() => {
        void handleDeleteData();
      }}
      okText={t`Yes`}
      cancelText={t`No`}
    >
      <Button icon={<DeleteOutlined />} danger loading={isDeleting}>
        <Trans>Delete all app data</Trans>
      </Button>
    </Popconfirm>
  );
}
