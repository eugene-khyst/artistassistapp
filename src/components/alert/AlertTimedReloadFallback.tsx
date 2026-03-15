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

import {Trans, useLingui} from '@lingui/react/macro';
import {Alert, Space, Typography} from 'antd';
import type React from 'react';
import {useEffect} from 'react';
import type {FallbackProps} from 'react-error-boundary';

import {ClearStorage} from '~/src/components/storage/ClearStorage';
import {useCountdown} from '~/src/hooks/useCountdown';
import {getErrorMessage} from '~/src/utils/error';
import {clearCache} from '~/src/utils/storage';

const DELAY_SECONDS = 5;

export const AlertTimedReloadFallback: React.FC<FallbackProps> = ({error}: FallbackProps) => {
  const {t} = useLingui();

  const reloadCounter = useCountdown(true, DELAY_SECONDS);

  const errorMessage: string = getErrorMessage(error);
  const message: string = t`Unexpected error: ${errorMessage}`;

  useEffect(() => {
    if (reloadCounter === 0) {
      void clearCache();
    }
  }, [reloadCounter]);

  return (
    <Alert
      type="error"
      title={t`An application error`}
      description={
        <Space orientation="vertical">
          <Typography.Text>{message}</Typography.Text>
          {reloadCounter > 0 && (
            <Typography.Text>
              <Trans>The app will attempt to reload in {reloadCounter} sec</Trans>
            </Typography.Text>
          )}
        </Space>
      }
      action={<ClearStorage orientation="vertical" />}
    />
  );
};
