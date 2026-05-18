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
import type {CSSProperties} from 'react';
import type {FallbackProps} from 'react-error-boundary';

import {ClearCacheButton} from '~/src/components/storage/ClearCacheButton';
import {DeleteAppDataButton} from '~/src/components/storage/DeleteAppDataButton';
import {WEBSITE_URL} from '~/src/config';
import {getErrorMessage} from '~/src/utils/error';

const preStyle: CSSProperties = {whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0};

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
            <pre style={preStyle}>{t`Unexpected error: ${errorMessage}`}</pre>
          </Typography.Paragraph>
          {error instanceof Error && error.stack && (
            <Typography.Paragraph>
              <pre style={preStyle}>{error.stack}</pre>
            </Typography.Paragraph>
          )}
        </Typography>
      }
      action={
        <Space orientation="vertical" style={{margin: 8}}>
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
      style={{margin: 8}}
    />
  );
}
