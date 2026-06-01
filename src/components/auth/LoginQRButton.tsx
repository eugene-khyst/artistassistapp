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

import {QrcodeOutlined} from '@ant-design/icons';
import {Plural, Trans, useLingui} from '@lingui/react/macro';
import {Button, Modal, Space, Spin, Typography} from 'antd';
import {useState} from 'react';

import {QRCode} from '@/components/qr/QRCode';
import {useCountdownUntil} from '@/hooks/useCountdownUntil';
import {useAppStore} from '@/stores/app-store';

interface LoginQRModalProps {
  loading: boolean;
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

function LoginQRModal({loading, open, onClose, onRefresh}: Readonly<LoginQRModalProps>) {
  const loginLink = useAppStore(state => state.loginLink);

  const {t} = useLingui();

  const expiresIn = useCountdownUntil(loginLink?.expiresAt, open && !!loginLink && !loading);
  const hasValidLoginLink = loginLink && expiresIn > 0;

  return (
    <Modal
      title={t`Login QR code`}
      centered
      open={open}
      footer={
        hasValidLoginLink ? null : (
          <Button type="primary" onClick={onRefresh}>
            <Trans>Get a new QR code</Trans>
          </Button>
        )
      }
      onCancel={onClose}
    >
      <Spin spinning={loading}>
        <Space orientation="vertical">
          {hasValidLoginLink ? (
            <>
              <Typography.Text>
                <Trans>Scan this code on the device you want to log in.</Trans>
              </Typography.Text>
              <QRCode value={loginLink.link.toString()} />
              <Typography.Text>
                <Plural
                  value={expiresIn}
                  one="QR code expires in # second"
                  other="QR code expires in # seconds"
                />
              </Typography.Text>
            </>
          ) : (
            <Typography.Text>
              <Trans>QR code expired.</Trans>
            </Typography.Text>
          )}
        </Space>
      </Spin>
    </Modal>
  );
}

export function LoginQRButton() {
  const getLoginLink = useAppStore(state => state.getLoginLink);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loadLoginLink = async () => {
    setIsLoading(true);
    try {
      await getLoginLink();
    } catch {
      // AuthFeedbackHandler surfaces the error.
    } finally {
      setIsLoading(false);
    }
  };

  const handleClick = () => {
    setIsModalOpen(true);
    void loadLoginLink();
  };

  return (
    <>
      <Button type="primary" icon={<QrcodeOutlined />} onClick={handleClick}>
        <Trans>Show login QR</Trans>
      </Button>
      <LoginQRModal
        loading={isLoading}
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
        }}
        onRefresh={() => {
          void loadLoginLink();
        }}
      />
    </>
  );
}
