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

import {LoadingOutlined, StopOutlined} from '@ant-design/icons';
import {Trans} from '@lingui/react/macro';
import {Button, Space, Spin, Typography} from 'antd';
import {clsx} from 'clsx';
import type {PropsWithChildren, ReactNode} from 'react';

import styles from './LoadingIndicator.module.css';

interface Props extends PropsWithChildren {
  loading?: boolean;
  tip?: ReactNode;
  onCancel?: (() => void) | false | null;
}

export function LoadingIndicator({loading = false, tip, onCancel, children}: Readonly<Props>) {
  return (
    <div className={styles['root']} aria-busy={loading}>
      <div className={clsx(styles['content'], loading && styles['dimmed'])} inert={loading}>
        {children}
      </div>
      {loading && (
        <div className={styles['overlay']}>
          <Spin
            size="large"
            indicator={<LoadingOutlined spin />}
            className={styles['indicator']}
            description={
              <Space orientation="vertical" align="center">
                <Typography.Text className="u-text-primary">
                  {tip ?? <Trans>Processing...</Trans>}
                </Typography.Text>
                {onCancel && (
                  <Button icon={<StopOutlined />} onClick={onCancel}>
                    <Trans>Cancel</Trans>
                  </Button>
                )}
              </Space>
            }
          />
        </div>
      )}
    </div>
  );
}
