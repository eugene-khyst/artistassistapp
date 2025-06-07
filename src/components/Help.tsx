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
  CloudSyncOutlined,
  FileProtectOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  MailOutlined,
  ReadOutlined,
  ReloadOutlined,
  StopOutlined,
} from '@ant-design/icons';
import type {ProgressProps} from 'antd';
import {Button, Col, Flex, Progress, Row, Space, theme, Typography} from 'antd';
import dayjs from 'dayjs';
import {useState} from 'react';

import {AdCard} from '~/src/components/ad/AdCard';
import {ClearStorage} from '~/src/components/storage/ClearStorage';
import {COMMIT_HASH, DATE_TIME_FORMAT, WEBSITE_URL} from '~/src/config';
import {useAuth} from '~/src/hooks/useAuth';
import {useAppStore} from '~/src/stores/app-store';
import {formatBytes} from '~/src/utils/format';

import {Logo} from './image/Logo';

const THREE_COLORS: ProgressProps['strokeColor'] = {
  '0%': '#00FF00',
  '50%': '#FFFF00',
  '100%': '#FF0000',
};

export const Help: React.FC = () => {
  const storageUsage = useAppStore(state => state.storageUsage);

  const {
    token: {fontSizeSM},
  } = theme.useToken();

  const {expiration} = useAuth();

  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  const handleUpdateClick = async () => {
    if ('serviceWorker' in navigator) {
      setIsUpdating(true);
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        await registration?.update();
      } finally {
        setIsUpdating(false);
      }
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
              rel="noopener"
              icon={<ReadOutlined />}
              size="large"
            >
              Tutorials
            </Button>
            <Button
              type="link"
              href={WEBSITE_URL}
              target="_blank"
              rel="noopener"
              icon={<InfoCircleOutlined />}
              size="large"
            >
              About ArtistAssistApp
            </Button>
            <Button
              type="link"
              href="https://support.patreon.com/hc/en-us/articles/360005502572-Canceling-a-paid-membership"
              target="_blank"
              rel="noopener noreferrer"
              icon={<StopOutlined />}
              size="large"
            >
              Cancel a paid membership
            </Button>
          </Space>
        </Col>
        <Col xs={24} md={12}>
          <Space direction="vertical" align="start" size={0} style={{width: '100%'}}>
            <Button
              type="link"
              href={`${WEBSITE_URL}/contact/`}
              target="_blank"
              rel="noopener"
              icon={<MailOutlined />}
              size="large"
            >
              Contact
            </Button>
            <Button
              type="link"
              href={`${WEBSITE_URL}/privacy-policy/`}
              target="_blank"
              rel="noopener"
              icon={<FileProtectOutlined />}
              size="large"
            >
              Privacy policy
            </Button>
            <Button
              type="link"
              href={`${WEBSITE_URL}/terms-of-use/`}
              target="_blank"
              rel="noopener"
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

      <ClearStorage />

      <Typography.Text type="secondary">
        The app stores all data in the web browser storage even after installation. Clearing the web
        browser data results in the loss of all app data.
      </Typography.Text>

      <Typography.Text>
        ArtistAssistApp is developed by{' '}
        <Typography.Link href="https://github.com/eugene-khyst" target="_blank" rel="noopener">
          Eugene Khyst
        </Typography.Link>
      </Typography.Text>

      <Typography.Text type="secondary" style={{fontSize: fontSizeSM}}>
        App build hash: {COMMIT_HASH}
      </Typography.Text>

      {expiration && (
        <Typography.Text type="secondary" style={{fontSize: fontSizeSM}}>
          Login session is valid until {dayjs(expiration).format(DATE_TIME_FORMAT)}
        </Typography.Text>
      )}
    </Flex>
  );
};
