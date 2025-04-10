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

import {
  ClearOutlined,
  CloudSyncOutlined,
  DeleteOutlined,
  FileProtectOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  MailOutlined,
  ReadOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type {ProgressProps} from 'antd';
import {Button, Col, Flex, Popconfirm, Progress, Row, Space, theme, Typography} from 'antd';
import {useState} from 'react';

import {AdCard} from '~/src/components/ad/AdCard';
import {COMMIT_HASH, WEBSITE_URL} from '~/src/config';
import {deleteDatabase} from '~/src/services/db/db';
import {useAppStore} from '~/src/stores/app-store';
import {formatBytes} from '~/src/utils/format';

import {Logo} from './image/Logo';

const THREE_COLORS: ProgressProps['strokeColor'] = {
  '0%': '#00FF00',
  '50%': '#FFFF00',
  '100%': '#FF0000',
};

const clearCache = async () => {
  const keys = await caches.keys();
  await Promise.all(keys.map(key => caches.delete(key)));
};

const deleteAppData = async () => {
  void deleteDatabase();
  void clearCache();
  const registration = await navigator.serviceWorker.getRegistration();
  await registration?.unregister();
};

export const Help: React.FC = () => {
  const storageUsage = useAppStore(state => state.storageUsage);

  const {
    token: {fontSizeSM},
  } = theme.useToken();

  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  const handleUpdateClick = async () => {
    if ('serviceWorker' in navigator) {
      setIsUpdating(true);
      const registration = await navigator.serviceWorker.getRegistration();
      await registration?.update();
      setIsUpdating(false);
    }
  };

  return (
    <Flex vertical gap="small" align="center" style={{padding: '0 16px 16px'}}>
      <div style={{textAlign: 'center'}}>
        <Logo name tagline />
      </div>

      <Row gutter={24}>
        <Col xs={24} md={12}>
          <Space direction="vertical" align="start" size={0} style={{width: '100%'}}>
            <Button
              type="link"
              href={`${WEBSITE_URL}/tutorials/`}
              target="_blank"
              icon={<ReadOutlined />}
              size="large"
            >
              Tutorials
            </Button>
            <Button
              type="link"
              href={WEBSITE_URL}
              target="_blank"
              icon={<InfoCircleOutlined />}
              size="large"
            >
              About ArtistAssistApp
            </Button>
            <Button
              type="link"
              href={`${WEBSITE_URL}/contact/`}
              target="_blank"
              icon={<MailOutlined />}
              size="large"
            >
              Contact
            </Button>
          </Space>
        </Col>
        <Col xs={24} md={12}>
          <Space direction="vertical" align="start" size={0} style={{width: '100%'}}>
            <Button
              type="link"
              href={`${WEBSITE_URL}/privacy-policy/`}
              target="_blank"
              icon={<FileProtectOutlined />}
              size="large"
            >
              Privacy policy
            </Button>
            <Button
              type="link"
              href={`${WEBSITE_URL}/terms-of-use/`}
              target="_blank"
              icon={<FileTextOutlined />}
              size="large"
            >
              Terms of use
            </Button>
          </Space>
        </Col>
      </Row>

      <Row justify="center">
        <Col xs={24} md={12}>
          <AdCard />
        </Col>
      </Row>

      <Space>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => {
            window.location.reload();
          }}
        >
          Reload
        </Button>
        <Button
          icon={<CloudSyncOutlined />}
          loading={isUpdating}
          onClick={() => void handleUpdateClick()}
        >
          Check for updates
        </Button>
      </Space>

      {storageUsage?.usage && storageUsage.quota && (
        <Space size="middle">
          <Space direction="vertical">
            <Typography.Text strong>Storage usage</Typography.Text>
            <Typography.Text>Used: {formatBytes(storageUsage.usage)}</Typography.Text>
            <Typography.Text>Quota: {formatBytes(storageUsage.quota)}</Typography.Text>
          </Space>
          <Progress
            type="circle"
            percent={Math.round(100 * (storageUsage.usage / storageUsage.quota))}
            size={80}
            status="normal"
            strokeColor={THREE_COLORS}
          />
        </Space>
      )}

      <Space>
        <Popconfirm
          title="Clear cache"
          description="Are you sure you want to clear the cache?"
          onConfirm={() => {
            void clearCache();
            window.location.reload();
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
            void deleteAppData();
            window.location.reload();
          }}
          okText="Yes"
          cancelText="No"
        >
          <Button icon={<DeleteOutlined />} danger>
            Delete all app data
          </Button>
        </Popconfirm>
      </Space>

      <Typography.Text type="secondary">
        The app stores all data in the web browser storage even after installation. Clearing the web
        browser data results in the loss of all app data.
      </Typography.Text>

      <Typography.Text>
        ArtistAssistApp is developed by{' '}
        <Typography.Link href="https://github.com/eugene-khyst" target="_blank">
          Eugene Khyst
        </Typography.Link>
      </Typography.Text>

      <Typography.Text type="secondary" style={{fontSize: fontSizeSM}}>
        App build hash: {COMMIT_HASH}
      </Typography.Text>
    </Flex>
  );
};
