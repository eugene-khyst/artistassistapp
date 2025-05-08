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
import type {SpaceProps} from 'antd';
import {Button, Popconfirm, Space} from 'antd';
import React from 'react';

import {clearCache, deleteAppData, unregisterServiceWorker} from '~/src/utils/storage';

type Props = Pick<SpaceProps, 'direction'>;

export const ClearStorage: React.FC<Props> = ({direction}: Props) => {
  return (
    <Space direction={direction} wrap>
      <Popconfirm
        title="Clear cache"
        description="Are you sure you want to clear the cache?"
        onConfirm={() => {
          void clearCache(true);
        }}
        okText="Yes"
        cancelText="No"
      >
        <Button icon={<ClearOutlined />}>Clear cache</Button>
      </Popconfirm>
      <Popconfirm
        title="Delete all app data"
        description="Are you sure you want to delete all app data?"
        onConfirm={() => {
          void deleteAppData(true);
        }}
        okText="Yes"
        cancelText="No"
      >
        <Button icon={<DeleteOutlined />} danger>
          Delete all app data
        </Button>
      </Popconfirm>
      <Popconfirm
        title="Unregister service worker"
        description="Are you sure you want to unregister service worker?"
        onConfirm={() => {
          void unregisterServiceWorker(true);
        }}
        okText="Yes"
        cancelText="No"
      >
        <Button icon={<CloseOutlined />} danger>
          Unregister service worker
        </Button>
      </Popconfirm>
    </Space>
  );
};
