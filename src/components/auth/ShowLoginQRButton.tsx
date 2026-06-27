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
import {Button, Modal, Space, Typography} from 'antd';

import {LoadingIndicator} from '@/components/loading/LoadingIndicator';
import {QRCode} from '@/components/qr/QRCode';
import {useCountdownUntil} from '@/hooks/useCountdownUntil';
import {useAppStore} from '@/stores/app-store';

interface LoginQRModalProps {
  loading: boolean;
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

const AUTH_MODAL_Z_INDEX = 1100;

function LoginQRModal({loading, open, onClose, onRefresh}: Readonly<LoginQRModalProps>) {
  const loginLink = useAppStore(state => state.loginLink);
  const isLoginLinkLoading = useAppStore(state => state.isLoginLinkLoading);

  const {t} = useLingui();

  const expiresIn: number = useCountdownUntil(
    loginLink?.expiresAt,
    open && !!loginLink && !loading
  );
  const hasValidLoginLink = loginLink && expiresIn > 0;

  return (
    <Modal
      title={t`Login QR code`}
      centered
      open={open}
      zIndex={AUTH_MODAL_Z_INDEX}
      footer={
        hasValidLoginLink ? null : (
          <Button type="primary" loading={isLoginLinkLoading} onClick={onRefresh}>
            <Trans>Get a new QR code</Trans>
          </Button>
        )
      }
      onCancel={onClose}
    >
      <LoadingIndicator loading={loading}>
        <Space orientation="vertical">
          {hasValidLoginLink ? (
            <>
              <Typography.Text>
                <Trans>Scan this code on the device you want to log in.</Trans>
              </Typography.Text>
              <QRCode value={loginLink.link.toString()} />
              {expiresIn < 60 && (
                <Typography.Text type="secondary">
                  <Plural
                    value={expiresIn}
                    one="QR code expires in # second"
                    other="QR code expires in # seconds"
                  />
                </Typography.Text>
              )}
            </>
          ) : (
            <Typography.Text>
              <Trans>QR code expired.</Trans>
            </Typography.Text>
          )}
        </Space>
      </LoadingIndicator>
    </Modal>
  );
}

export function ShowLoginQRButton() {
  const loadLoginLink = useAppStore(state => state.loadLoginLink);
  const isLoginLinkLoading = useAppStore(state => state.isLoginLinkLoading);
  const isLoginQRModalOpen = useAppStore(state => state.isLoginQRModalOpen);
  const setLoginQRModalOpen = useAppStore(state => state.setLoginQRModalOpen);

  const handleClick = async () => {
    setLoginQRModalOpen(await loadLoginLink());
  };

  const handleRefresh = async () => {
    await loadLoginLink();
  };

  return (
    <>
      <Button
        type="primary"
        icon={<QrcodeOutlined />}
        loading={isLoginLinkLoading}
        onClick={() => {
          void handleClick();
        }}
      >
        <Trans>Show login QR code</Trans>
      </Button>
      <LoginQRModal
        loading={isLoginLinkLoading}
        open={isLoginQRModalOpen}
        onClose={() => {
          setLoginQRModalOpen(false);
        }}
        onRefresh={() => {
          void handleRefresh();
        }}
      />
    </>
  );
}
