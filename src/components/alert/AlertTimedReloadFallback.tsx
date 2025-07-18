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

import {Trans, useLingui} from '@lingui/react/macro';
import {Alert, Space, Typography} from 'antd';
import React, {useEffect, useState} from 'react';
import type {FallbackProps} from 'react-error-boundary';

import {ClearStorage} from '~/src/components/storage/ClearStorage';
import {clearCache} from '~/src/utils/storage';

const DELAY_SECONDS = 5;

export const AlertTimedReloadFallback: React.FC<FallbackProps> = ({error}: FallbackProps) => {
  const {t} = useLingui();

  const [reloadCounter, setReloadCounter] = useState<number>(DELAY_SECONDS);

  useEffect(() => {
    const countdownIntervalId = setInterval(() => {
      setReloadCounter(prev => {
        if (prev <= 1) {
          clearInterval(countdownIntervalId);
          void clearCache();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(countdownIntervalId);
    };
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
  const errorMessage = (error || t`Unknown error`).toString();

  return (
    <Alert
      type="error"
      message={t`An application error`}
      description={
        <Space direction="vertical">
          <Typography.Text>{errorMessage}</Typography.Text>
          {reloadCounter > 0 && (
            <Typography.Text>
              <Trans>The app will attempt to reload in {reloadCounter} sec</Trans>
            </Typography.Text>
          )}
        </Space>
      }
      action={<ClearStorage direction="vertical" />}
    />
  );
};
