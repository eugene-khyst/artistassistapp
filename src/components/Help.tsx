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
  CheckCircleOutlined,
  CloseCircleOutlined,
  CloudSyncOutlined,
  FileProtectOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  MailOutlined,
  ReadOutlined,
  ReloadOutlined,
  StopOutlined,
} from '@ant-design/icons';
import {Trans} from '@lingui/react/macro';
import type {ProgressProps} from 'antd';
import {
  Button,
  Col,
  Divider,
  Flex,
  Progress,
  Row,
  Space,
  Switch,
  Tag,
  theme,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import {useState} from 'react';

import {AdCard} from '~/src/components/ad/AdCard';
import {ClearStorage} from '~/src/components/storage/ClearStorage';
import {COMMIT_HASH, DATE_TIME_FORMAT, WEBSITE_URL} from '~/src/config';
import {useAppStore} from '~/src/stores/app-store';
import {formatBytes} from '~/src/utils/format';

import {Logo} from './image/Logo';

const THREE_COLORS: ProgressProps['strokeColor'] = {
  '0%': '#00FF00',
  '50%': '#FFFF00',
  '100%': '#FF0000',
};

export const Help: React.FC = () => {
  const expiration = useAppStore(state => state.auth?.expiration);
  const storagePersisted = useAppStore(state => state.storagePersisted);
  const storageUsage = useAppStore(state => state.storageUsage);
  const autoSavingColorSetsJson = useAppStore(state => state.appSettings.autoSavingColorSetsJson);

  const saveAppSettings = useAppStore(state => state.saveAppSettings);

  const {
    token: {fontSizeSM},
  } = theme.useToken();

  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  const expirationText: string | undefined =
    expiration && dayjs(expiration).format(DATE_TIME_FORMAT);

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

  const handleAutoBackupChange = (checked: boolean) => {
    void saveAppSettings({
      autoSavingColorSetsJson: !!checked,
    });
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
              <Trans>Tutorials and videos</Trans>
            </Button>
            <Button
              type="link"
              href={WEBSITE_URL}
              target="_blank"
              rel="noopener"
              icon={<InfoCircleOutlined />}
              size="large"
            >
              <Trans>About ArtistAssistApp</Trans>
            </Button>
            <Button
              type="link"
              href="https://support.patreon.com/hc/en-us/articles/360005502572-Canceling-a-paid-membership"
              target="_blank"
              rel="noopener noreferrer"
              icon={<StopOutlined />}
              size="large"
            >
              <Trans>Cancel a paid membership</Trans>
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
              <Trans>Contact</Trans>
            </Button>
            <Button
              type="link"
              href={`${WEBSITE_URL}/privacy-policy/`}
              target="_blank"
              rel="noopener"
              icon={<FileProtectOutlined />}
              size="large"
            >
              <Trans>Privacy policy</Trans>
            </Button>
            <Button
              type="link"
              href={`${WEBSITE_URL}/terms-of-use/`}
              target="_blank"
              rel="noopener"
              icon={<FileTextOutlined />}
              size="large"
            >
              <Trans>Terms of use</Trans>
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
          <Trans>Reload</Trans>
        </Button>
        <Button
          icon={<CloudSyncOutlined />}
          loading={isUpdating}
          onClick={() => void handleUpdateClick()}
        >
          <Trans>Check for updates</Trans>
        </Button>
      </Space>

      <Divider size="small" />

      <Space>
        <Typography.Text>
          <Trans>Automatic backup of color sets</Trans>
        </Typography.Text>
        <Switch value={autoSavingColorSetsJson} onChange={handleAutoBackupChange} />
      </Space>

      <Divider size="small" />

      <Space>
        <Typography.Text>
          <Trans>Persistent storage</Trans>
        </Typography.Text>
        {storagePersisted ? (
          <Tag icon={<CheckCircleOutlined />} color="success">
            Enabled
          </Tag>
        ) : (
          <Tag icon={<CloseCircleOutlined />} color="warning">
            Disabled
          </Tag>
        )}
      </Space>

      {storageUsage?.usage && storageUsage.quota && (
        <Space size="middle">
          <Space direction="vertical">
            <Typography.Text>
              <Trans>Storage usage</Trans>
            </Typography.Text>
            <Typography.Text>
              <Trans>Used</Trans>: {formatBytes(storageUsage.usage)}
            </Typography.Text>
            <Typography.Text>
              <Trans>Quota</Trans>: {formatBytes(storageUsage.quota)}
            </Typography.Text>
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
        <Trans>
          The app stores all data in the web browser storage even after installation. Clearing the
          web browser data results in the loss of all app data.
        </Trans>
      </Typography.Text>

      <Divider size="small" />

      <Typography.Text>
        <Trans>
          ArtistAssistApp is developed by{' '}
          <Typography.Link href="https://github.com/eugene-khyst" target="_blank" rel="noopener">
            Eugene Khyst
          </Typography.Link>
        </Trans>
      </Typography.Text>

      <Typography.Text type="secondary" style={{fontSize: fontSizeSM}}>
        <Trans>Application build hash</Trans>: {COMMIT_HASH}
      </Typography.Text>

      {expirationText && (
        <Typography.Text type="secondary" style={{fontSize: fontSizeSM}}>
          <Trans>Login session is valid until {expirationText}</Trans>
        </Typography.Text>
      )}
    </Flex>
  );
};
