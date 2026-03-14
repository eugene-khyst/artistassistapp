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

import {LoadingOutlined, StopOutlined} from '@ant-design/icons';
import {Trans} from '@lingui/react/macro';
import {Button, Space, Spin, theme, Typography} from 'antd';
import type {PropsWithChildren, ReactNode} from 'react';

interface Props extends PropsWithChildren {
  loading?: boolean;
  downloadTip?: ReactNode;
  onCancel?: (() => void) | false;
}

export const LoadingIndicator: React.FC<Props> = ({
  loading,
  downloadTip,
  onCancel,
  children,
}: Props) => {
  const {
    token: {colorPrimary},
  } = theme.useToken();

  return (
    <Spin
      spinning={loading}
      size="large"
      indicator={<LoadingOutlined spin />}
      description={
        <Space orientation="vertical" align="center">
          {
            <Typography.Text style={{color: colorPrimary}}>
              {downloadTip ? (
                <>
                  <Trans>Downloading...</Trans> {downloadTip}
                </>
              ) : (
                <Trans>Processing...</Trans>
              )}
            </Typography.Text>
          }
          {onCancel && (
            <Button icon={<StopOutlined />} onClick={onCancel}>
              <Trans>Cancel</Trans>
            </Button>
          )}
        </Space>
      }
    >
      {children}
    </Spin>
  );
};
