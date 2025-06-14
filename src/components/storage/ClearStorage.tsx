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

import {ClearOutlined, DeleteOutlined} from '@ant-design/icons';
import {Trans, useLingui} from '@lingui/react/macro';
import type {SpaceProps} from 'antd';
import {Button, Popconfirm, Space} from 'antd';
import React, {useState} from 'react';

import {clearCache, deleteAppData} from '~/src/utils/storage';

type Props = Pick<SpaceProps, 'direction'>;

export const ClearStorage: React.FC<Props> = ({direction}: Props) => {
  const {t} = useLingui();

  const [isClearingCache, setIsClearingCache] = useState<boolean>(false);
  const [isDeleteingData, setIsDeleteingData] = useState<boolean>(false);

  const handleClearCache = async () => {
    setIsClearingCache(true);
    try {
      await clearCache();
    } finally {
      setIsClearingCache(false);
    }
  };

  const handleDeleteData = async () => {
    setIsDeleteingData(true);
    try {
      await deleteAppData();
    } finally {
      setIsDeleteingData(false);
    }
  };

  return (
    <Space direction={direction} wrap>
      <Popconfirm
        title={t`Clear cache`}
        description={t`Are you sure you want to clear the cache?`}
        onConfirm={() => {
          void handleClearCache();
        }}
        okText={t`Yes`}
        cancelText={t`No`}
      >
        <Button icon={<ClearOutlined />} loading={isClearingCache}>
          <Trans>Clear cache</Trans>
        </Button>
      </Popconfirm>
      <Popconfirm
        title={t`Delete all app data`}
        description={t`Are you sure you want to delete all app data?`}
        onConfirm={() => {
          void handleDeleteData();
        }}
        okText={t`Yes`}
        cancelText={t`No`}
      >
        <Button icon={<DeleteOutlined />} danger loading={isDeleteingData}>
          <Trans>Delete all app data</Trans>
        </Button>
      </Popconfirm>
    </Space>
  );
};
