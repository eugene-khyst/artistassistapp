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

import {ReloadOutlined} from '@ant-design/icons';
import {Trans, useLingui} from '@lingui/react/macro';
import {Alert, Button, Space, Typography} from 'antd';
import type {FallbackProps} from 'react-error-boundary';

import {ClearCacheButton} from '@/components/storage/ClearCacheButton';
import {DeleteAppDataButton} from '@/components/storage/DeleteAppDataButton';
import {WEBSITE_URL} from '@/config';
import {getErrorMessage} from '@/utils/error';

import styles from './ErrorFallback.module.css';

export function ErrorFallback({error}: Readonly<FallbackProps>) {
  const {t} = useLingui();
  const errorMessage: string = getErrorMessage(error);
  return (
    <Alert
      type="error"
      title={t`Something went wrong`}
      description={
        <Typography>
          <Typography.Paragraph>
            <Trans>
              Please send us a screenshot of this error via our{' '}
              <Typography.Link href={`${WEBSITE_URL}/contact/`} target="_blank" rel="noopener">
                contacts
              </Typography.Link>
              . It will help us identify the cause.
            </Trans>
          </Typography.Paragraph>
          <Typography.Paragraph>
            <pre className={styles['pre']}>{t`Unexpected error: ${errorMessage}`}</pre>
          </Typography.Paragraph>
          {error instanceof Error && error.stack && (
            <Typography.Paragraph>
              <pre className={styles['pre']}>{error.stack}</pre>
            </Typography.Paragraph>
          )}
        </Typography>
      }
      action={
        <Space orientation="vertical" className={styles['action']}>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              window.location.reload();
            }}
          >
            <Trans>Reload</Trans>
          </Button>
          <ClearCacheButton />
          <DeleteAppDataButton />
        </Space>
      }
      className={styles['alert']}
    />
  );
}
