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

import {Plural, Trans, useLingui} from '@lingui/react/macro';
import {Button, Flex, Form, Input, Modal, Space, Typography} from 'antd';
import {useState} from 'react';

import {LoadingIndicator} from '@/components/loading/LoadingIndicator';
import {useCountdownUntil} from '@/hooks/useCountdownUntil';
import {AuthErrorType} from '@/services/auth/types';
import {useAppStore} from '@/stores/app-store';

interface EmailForm {
  email?: string;
}

interface OtpForm {
  otp?: string;
}

interface LoginEmailModalProps {
  open: boolean;
  onClose: () => void;
}

interface LoginEmailFormProps {
  onRequestCode: (email?: string) => Promise<void>;
}

interface LoginEmailOtpFormProps {
  email?: string;
  expiresIn: number;
}

const AUTH_MODAL_Z_INDEX = 1100;

function LoginEmailForm({onRequestCode}: Readonly<LoginEmailFormProps>) {
  const isRequestLoginEmailOtpLoading = useAppStore(state => state.isRequestLoginEmailOtpLoading);

  const {t} = useLingui();

  const onFinish = ({email}: EmailForm) => {
    void onRequestCode(email);
  };

  return (
    <Form<EmailForm> className="u-w-100" onFinish={onFinish} validateTrigger="onSubmit">
      <Flex vertical gap="small">
        <Typography.Text>
          <Trans>
            Enter the email address for your Patreon account. We&apos;ll send a one-time login code
            if it has an active ArtistAssistApp membership.
          </Trans>
        </Typography.Text>
        <Typography.Text>
          <Trans>
            Not sure which email Patreon uses? Check your{' '}
            <Typography.Link
              strong
              href="https://www.patreon.com/settings/basics"
              target="_blank"
              rel="noopener noreferrer"
            >
              Patreon basic settings
            </Typography.Link>
            .
          </Trans>
        </Typography.Text>
        <Form.Item
          name="email"
          className="u-w-100"
          rules={[
            {
              required: true,
              message: t`Email is required`,
            },
            {
              type: 'email',
              message: t`Enter a valid email`,
            },
          ]}
        >
          <Input
            type="email"
            size="large"
            autoFocus
            autoComplete="email"
            placeholder={t`name@example.com`}
            allowClear
          />
        </Form.Item>
        <div className="u-w-100 u-text-right">
          <Button type="primary" htmlType="submit" loading={isRequestLoginEmailOtpLoading}>
            <Trans>Get a code</Trans>
          </Button>
        </div>
      </Flex>
    </Form>
  );
}

function LoginEmailOtpForm({email, expiresIn}: Readonly<LoginEmailOtpFormProps>) {
  const loginEmailOtp = useAppStore(state => state.loginEmailOtp);
  const loginEmailOtpRetryAt = useAppStore(state => state.loginEmailOtpRetryAt);
  const isRequestLoginEmailOtpLoading = useAppStore(state => state.isRequestLoginEmailOtpLoading);
  const isVerifyLoginEmailOtpLoading = useAppStore(state => state.isVerifyLoginEmailOtpLoading);
  const requestLoginEmailOtp = useAppStore(state => state.requestLoginEmailOtp);
  const verifyLoginEmailOtp = useAppStore(state => state.verifyLoginEmailOtp);

  const {t} = useLingui();

  const [form] = Form.useForm<OtpForm>();

  const retryIn: number = useCountdownUntil(loginEmailOtpRetryAt, !!loginEmailOtp);

  const requestCode = async () => {
    if (!email) {
      return;
    }
    form.resetFields();
    await requestLoginEmailOtp(email);
  };

  const onFinish = async ({otp}: OtpForm) => {
    if (!email || !otp) {
      return;
    }
    const authErrorType = await verifyLoginEmailOtp(email, otp);
    if (authErrorType === AuthErrorType.InvalidLoginOtp) {
      form.resetFields();
    }
  };

  return (
    <Form<OtpForm>
      form={form}
      className="u-w-100"
      onFinish={values => {
        void onFinish(values);
      }}
      validateTrigger="onSubmit"
    >
      <Flex vertical align="center" gap="small">
        <Typography.Text>
          <Trans>
            Sent to <Typography.Text strong>{email}</Typography.Text>
          </Trans>
        </Typography.Text>
        <Form.Item
          name="otp"
          rules={[
            {
              required: true,
              message: t`Code is required`,
            },
          ]}
        >
          <Input.OTP autoFocus inputMode="numeric" length={6} size="large" />
        </Form.Item>
        {expiresIn < 60 && (
          <Typography.Text type="secondary">
            <Plural
              value={expiresIn}
              one="Code expires in # second"
              other="Code expires in # seconds"
            />
          </Typography.Text>
        )}
        <div className="u-w-100 u-text-right">
          <Space>
            <Button
              onClick={() => {
                void requestCode();
              }}
              loading={isRequestLoginEmailOtpLoading}
              disabled={retryIn > 0}
            >
              {retryIn > 0 ? (
                <Plural
                  value={retryIn}
                  one="Resend code in # second"
                  other="Resend code in # seconds"
                />
              ) : (
                <Trans>Resend code</Trans>
              )}
            </Button>
            <Button type="primary" htmlType="submit" loading={isVerifyLoginEmailOtpLoading}>
              <Trans>Log in</Trans>
            </Button>
          </Space>
        </div>
      </Flex>
    </Form>
  );
}

function LoginEmailOtpModal({open, onClose}: Readonly<LoginEmailModalProps>) {
  const loginEmailOtp = useAppStore(state => state.loginEmailOtp);
  const isRequestLoginEmailOtpLoading = useAppStore(state => state.isRequestLoginEmailOtpLoading);
  const isVerifyLoginEmailOtpLoading = useAppStore(state => state.isVerifyLoginEmailOtpLoading);
  const requestLoginEmailOtp = useAppStore(state => state.requestLoginEmailOtp);

  const {t} = useLingui();

  const [email, setEmail] = useState<string>();

  const isLoading: boolean = isRequestLoginEmailOtpLoading || isVerifyLoginEmailOtpLoading;

  const expiresIn: number = useCountdownUntil(
    loginEmailOtp?.expiresAt,
    open && !!loginEmailOtp && !isRequestLoginEmailOtpLoading
  );

  const hasValidLoginEmailOtp = loginEmailOtp && expiresIn > 0;

  const requestCode = async (email?: string) => {
    if (!email) {
      return;
    }
    setEmail(email);
    await requestLoginEmailOtp(email);
  };

  return (
    <Modal
      title={hasValidLoginEmailOtp ? t`Enter the code` : t`Log in with email`}
      centered
      open={open}
      footer={null}
      zIndex={AUTH_MODAL_Z_INDEX}
      onCancel={onClose}
    >
      <LoadingIndicator loading={isLoading}>
        {hasValidLoginEmailOtp ? (
          <LoginEmailOtpForm email={email} expiresIn={expiresIn} />
        ) : (
          <LoginEmailForm onRequestCode={requestCode} />
        )}
      </LoadingIndicator>
    </Modal>
  );
}

export function LoginEmailOtpButton() {
  const isLoginEmailOtpModalOpen = useAppStore(state => state.isLoginEmailOtpModalOpen);
  const setLoginEmailOtpModalOpen = useAppStore(state => state.setLoginEmailOtpModalOpen);

  return (
    <>
      <Button
        type="primary"
        onClick={() => {
          setLoginEmailOtpModalOpen(true);
        }}
      >
        <Trans>Log in with email</Trans>
      </Button>
      <LoginEmailOtpModal
        open={isLoginEmailOtpModalOpen}
        onClose={() => {
          setLoginEmailOtpModalOpen(false);
        }}
      />
    </>
  );
}
