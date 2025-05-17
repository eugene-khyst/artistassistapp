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

import {Alert, Space, Typography} from 'antd';
import React, {useEffect, useState} from 'react';
import type {FallbackProps} from 'react-error-boundary';

import {ClearStorage} from '~/src/components/storage/ClearStorage';
import {unregisterServiceWorker} from '~/src/utils/storage';

export const AlertTimedReloadFallback: React.FC<FallbackProps> = ({error}: FallbackProps) => {
  const [countdown, setCountdown] = useState<number>(5);

  useEffect(() => {
    const countdownInterval = setInterval(() => {
      setCountdown(prevCountdown => {
        if (prevCountdown <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prevCountdown - 1;
      });
    }, 1000);

    const reloadTimeout = setTimeout(() => {
      void unregisterServiceWorker(true);
    }, 5000);

    return () => {
      clearInterval(countdownInterval);
      clearTimeout(reloadTimeout);
    };
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
  const errorMessage = (error || 'Unknown error').toString();

  return (
    <Alert
      type="error"
      message="Application Error"
      description={
        <Space direction="vertical">
          <Typography.Text>{errorMessage}</Typography.Text>
          {countdown > 0 && (
            <Typography.Text>
              The app will attempt to reload in {countdown} second
              {countdown === 1 ? '' : 's'}...
            </Typography.Text>
          )}
        </Space>
      }
      action={<ClearStorage direction="vertical" />}
    />
  );
};
