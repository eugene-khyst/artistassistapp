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
import {Alert, Button, Typography} from 'antd';
import type React from 'react';
import {useState} from 'react';

import {cancelWaitingForPrimaryTabToClose, waitForPrimaryTabToClose} from '~/src/single-instance';

export const InstanceConflictAlert: React.FC = () => {
  const {t} = useLingui();

  const [isWaiting, setIsWaiting] = useState(false);

  const handleClick = () => {
    if (isWaiting) {
      if (cancelWaitingForPrimaryTabToClose()) {
        setIsWaiting(false);
      }
    } else if (waitForPrimaryTabToClose()) {
      setIsWaiting(true);
    }
  };

  return (
    <Alert
      type="warning"
      title={t`Already open in another tab`}
      description={
        <Typography>
          <Typography.Paragraph>
            <Trans>ArtistAssistApp can only be used in one browser tab at a time.</Trans>
          </Typography.Paragraph>
          {isWaiting ? (
            <Typography.Paragraph>
              <Trans>This tab will open automatically when the other tab closes.</Trans>
            </Typography.Paragraph>
          ) : (
            <Typography.Paragraph>
              <Trans>To use this tab instead, close the other tab.</Trans>
            </Typography.Paragraph>
          )}
        </Typography>
      }
      action={
        <Button type={isWaiting ? 'default' : 'primary'} onClick={handleClick}>
          {isWaiting ? <Trans>Cancel waiting</Trans> : <Trans>Use this tab instead</Trans>}
        </Button>
      }
      style={{margin: 8}}
    />
  );
};
