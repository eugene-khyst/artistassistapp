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

import {ClearOutlined, CloseOutlined, DeleteOutlined} from '@ant-design/icons';
import {Trans, useLingui} from '@lingui/react/macro';
import type {SpaceProps} from 'antd';
import {Button, Popconfirm, Space} from 'antd';
import React from 'react';

import {clearCache, deleteAppData, unregisterServiceWorker} from '~/src/utils/storage';

const SERVICE_WORKER = 'Service Worker';

type Props = Pick<SpaceProps, 'direction'>;

export const ClearStorage: React.FC<Props> = ({direction}: Props) => {
  const {t} = useLingui();

  return (
    <Space direction={direction} wrap>
      <Popconfirm
        title={t`Clear cache`}
        description={t`Are you sure you want to clear the cache?`}
        onConfirm={() => {
          void clearCache(true);
        }}
        okText={t`Yes`}
        cancelText={t`No`}
      >
        <Button icon={<ClearOutlined />}>
          <Trans>Clear cache</Trans>
        </Button>
      </Popconfirm>
      <Popconfirm
        title={t`Delete all app data`}
        description={t`Are you sure you want to delete all app data?`}
        onConfirm={() => {
          void deleteAppData();
        }}
        okText={t`Yes`}
        cancelText={t`No`}
      >
        <Button icon={<DeleteOutlined />} danger>
          <Trans>Delete all app data</Trans>
        </Button>
      </Popconfirm>
      <Popconfirm
        title={t`Unregister service worker`}
        description={t`Are you sure you want to unregister ${SERVICE_WORKER}?`}
        onConfirm={() => {
          void unregisterServiceWorker();
        }}
        okText={t`Yes`}
        cancelText={t`No`}
      >
        <Button icon={<CloseOutlined />} danger>
          <Trans>Unregister {SERVICE_WORKER}</Trans>
        </Button>
      </Popconfirm>
    </Space>
  );
};
