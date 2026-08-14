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

import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  CloudSyncOutlined,
  DownloadOutlined,
  FileProtectOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  MailOutlined,
  ReadOutlined,
  StopOutlined,
} from '@ant-design/icons';
import {Trans} from '@lingui/react/macro';
import {Button, Flex, Grid, Progress, type ProgressProps, Space, Tag, Typography} from 'antd';

import {DeleteAccountButton} from '@/components/auth/DeleteAccountButton';
import {LoadingButton} from '@/components/button/LoadingButton';
import {ClearCacheButton} from '@/components/storage/ClearCacheButton';
import {DeleteAppDataButton} from '@/components/storage/DeleteAppDataButton';
import {BUILD_ID, WEBSITE_URL} from '@/config';
import {useAppStore} from '@/stores/app-store';
import {formatBytes} from '@/utils/format';

import {Logo} from './image/Logo';

const THREE_COLORS: ProgressProps['strokeColor'] = {
  '0%': '#00FF00',
  '50%': '#FFFF00',
  '100%': '#FF0000',
};

const handleUpdateClick = async () => {
  if (!('serviceWorker' in navigator)) {
    return;
  }
  const registration = await navigator.serviceWorker.getRegistration();
  await registration?.update();
};

export function Help() {
  const screens = Grid.useBreakpoint();

  const user = useAppStore(state => state.auth?.user);
  const storagePersisted = useAppStore(state => state.storagePersisted);
  const storageUsage = useAppStore(state => state.storageUsage);
  const serviceWorkerRegistration = useAppStore(state => state.serviceWorkerRegistration);

  const updateServiceWorker = useAppStore(state => state.updateServiceWorker);

  return (
    <Flex vertical gap="medium" align="center" className="u-tab-content">
      <div className="u-text-center">
        <Logo name tagline />
      </div>

      <Flex vertical={!screens.md} gap={screens.md ? 'large' : 0}>
        <Flex vertical align="start">
          <Button
            type="link"
            color="primary"
            variant="dashed"
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
        </Flex>
        <Flex vertical align="start">
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
        </Flex>
      </Flex>

      {serviceWorkerRegistration ? (
        <Space>
          <Trans>A new version of the application is available.</Trans>
          <Button type="primary" icon={<DownloadOutlined />} onClick={updateServiceWorker}>
            <Trans>Install update</Trans>
          </Button>
        </Space>
      ) : (
        <LoadingButton icon={<CloudSyncOutlined />} run={handleUpdateClick}>
          <Trans>Check for updates</Trans>
        </LoadingButton>
      )}

      <Flex vertical gap="small" align="center">
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
            <Space orientation="vertical">
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
      </Flex>

      <ClearCacheButton />

      <Flex vertical gap={0} align="center">
        <DeleteAppDataButton />
        <Typography.Text>
          <Trans>
            All app data is stored in the web browser storage, even after installation. Clearing the
            browser data deletes it all.
          </Trans>
        </Typography.Text>
      </Flex>

      {user && (
        <Flex vertical gap={0} align="center">
          <DeleteAccountButton />

          <Typography.Text>
            <Trans>
              ArtistAssistApp never stores your email address, only a private code derived from it
              that cannot reveal the address. Logging in with Patreon or a membership renewal
              creates that code again.
            </Trans>
          </Typography.Text>
          <Typography.Text>
            <Trans>
              Your Patreon membership and the data on this device are not deleted.{' '}
              <Typography.Link
                href="https://support.patreon.com/hc/en-us/articles/360005502572-Canceling-a-paid-membership"
                target="_blank"
                rel="noopener noreferrer"
              >
                Cancel your Patreon membership
              </Typography.Link>{' '}
              on Patreon itself.
            </Trans>
          </Typography.Text>
        </Flex>
      )}

      <Flex vertical gap="small" align="center">
        <Typography.Text>
          <Trans>
            ArtistAssistApp is developed by{' '}
            <Typography.Link href="https://github.com/eugene-khyst" target="_blank" rel="noopener">
              Eugene Khyst
            </Typography.Link>
          </Trans>
        </Typography.Text>

        <Typography.Text type="secondary" className="u-text-sm">
          <Trans>Application build ID</Trans>: {BUILD_ID}
        </Typography.Text>
      </Flex>
    </Flex>
  );
}
