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
import {App, Typography} from 'antd';
import type {PropsWithChildren, ReactNode} from 'react';
import {useEffect} from 'react';

import {AuthErrorType, AuthNoticeType} from '@/services/auth/types';
import {useAppStore} from '@/stores/app-store';
import {TabKey} from '@/tabs';

function formatContextValue(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(value);
}

const ERROR_TYPES_WITH_VISIBLE_CONTEXT: ReadonlySet<AuthErrorType> = new Set([
  AuthErrorType.Inactive,
  AuthErrorType.Unauthorized,
  AuthErrorType.Unknown,
]);

const ERROR_CONTEXT_LABELS: Record<string, ReactNode> = {
  message: <Trans>Details</Trans>,
  error: <Trans>Error</Trans>,
  error_description: <Trans>Error description</Trans>,
  email: <Trans>Email</Trans>,
  patron_status: <Trans>Patron status</Trans>,
  last_charge_status: <Trans>Last charge status</Trans>,
  next_charge_date: <Trans>Next charge date</Trans>,
  is_gifted: <Trans>Gifted membership</Trans>,
};

const AUTH_ERRORS: Record<
  string,
  {
    title: ReactNode;
    content: ReactNode;
  }
> = {
  [AuthErrorType.Inactive]: {
    title: <Trans>Patreon membership verification failed</Trans>,
    content: (
      <Typography>
        <p>
          <Trans>
            This usually happens when you&apos;re signed in to a{' '}
            <Typography.Text strong>different</Typography.Text> Patreon account than the one used
            for your ArtistAssistApp membership.
          </Trans>
        </p>
        <p>
          <Typography.Text strong>
            <Trans>To fix this:</Trans>
          </Typography.Text>
        </p>
        <ol>
          <li>
            <Trans>
              <Typography.Text strong>Check your Patreon account</Typography.Text>: Ensure you are
              signed in to{' '}
              <Typography.Link href="https://patreon.com" target="_blank" rel="noopener">
                Patreon.com
              </Typography.Link>{' '}
              in your web browser using the same email you used to purchase your membership. If you
              have multiple accounts, sign out and sign back in with the correct one.
            </Trans>
          </li>
          <li>
            <Trans>
              <Typography.Text strong>Use a web browser</Typography.Text>: If you are using the
              Patreon app (iOS/Android), log in via a web browser (Chrome, Safari, Firefox) instead,
              as the app can sometimes interfere with the verification process.
            </Trans>
          </li>
          <li>
            <Trans>
              <Typography.Text strong>Retry login</Typography.Text>: Once you have confirmed the
              correct Patreon account is active in your browser, log in to ArtistAssistApp again.
            </Trans>
          </li>
        </ol>
        <p>
          <Typography.Text strong>
            <Trans>Your account details:</Trans>
          </Typography.Text>
        </p>
      </Typography>
    ),
  },
  [AuthErrorType.MemberNotFound]: {
    title: <Trans>Patreon member email address not found</Trans>,
    content: (
      <Typography>
        <p>
          <Trans>
            We couldn&apos;t find an ArtistAssistApp Patreon membership for the email address you
            entered. Use the email address shown on your Patreon account for your ArtistAssistApp
            membership, then request a new login code.
          </Trans>
        </p>
        <p>
          <Trans>
            Open your{' '}
            <Typography.Link
              strong
              href="https://www.patreon.com/settings/basics"
              target="_blank"
              rel="noopener noreferrer"
            >
              Patreon basic settings
            </Typography.Link>{' '}
            and confirm that the listed email address is the same one you entered.
          </Trans>
        </p>
      </Typography>
    ),
  },
  [AuthErrorType.Expired]: {
    title: <Trans>Session expired</Trans>,
    content: (
      <Trans>
        Your login session has expired. Please sign in again to refresh your access and continue
        using ArtistAssistApp.
      </Trans>
    ),
  },
  [AuthErrorType.InvalidToken]: {
    title: <Trans>Authentication error</Trans>,
    content: (
      <Trans>
        We encountered a problem verifying your login credentials. This issue can usually be
        resolved by trying to log in again.
      </Trans>
    ),
  },
  [AuthErrorType.InvalidLoginLink]: {
    title: <Trans>Invalid login link</Trans>,
    content: (
      <Trans>This login link is invalid or has expired. Please get a new one and try again.</Trans>
    ),
  },
  [AuthErrorType.InvalidLoginOtp]: {
    title: <Trans>Invalid login code</Trans>,
    content: (
      <Trans>
        The code you entered is incorrect or expired. Check the latest email from ArtistAssistApp
        and try again, or request a new login code.
      </Trans>
    ),
  },
  [AuthErrorType.LoginOtpMaxAttemptsExceeded]: {
    title: <Trans>Too many incorrect codes</Trans>,
    content: (
      <Trans>This login code can&apos;t be used anymore. Request a new code to continue.</Trans>
    ),
  },
  [AuthErrorType.Unauthorized]: {
    title: <Trans>Sign in required</Trans>,
    content: (
      <Trans>
        We couldn&apos;t verify your session. Please sign in again to continue using
        ArtistAssistApp.
      </Trans>
    ),
  },
  [AuthErrorType.LoginResultMissing]: {
    title: <Trans>Login result not received</Trans>,
    content: (
      <Trans>
        ArtistAssistApp did not receive the result of your Patreon login. This can happen when login
        opens in another browser or app. Please try logging in again.
      </Trans>
    ),
  },
  [AuthErrorType.RateLimited]: {
    title: <Trans>Try again in a minute</Trans>,
    content: (
      <Trans>
        Too many login requests were made in a short time. Please wait a minute, then try again.
      </Trans>
    ),
  },
  [AuthErrorType.Unknown]: {
    title: <Trans>We couldn&apos;t verify your session</Trans>,
    content: (
      <Trans>
        Something went wrong while logging you in. Please try again. If the problem persists, check
        your internet connection.
      </Trans>
    ),
  },
};

const AUTH_NOTICES: Record<
  string,
  {
    title: ReactNode;
    description: ReactNode;
  }
> = {
  [AuthNoticeType.LoginCompletedInBrowser]: {
    title: <Trans>You&apos;re logged in</Trans>,
    description: (
      <Trans>
        You can keep working in this browser tab, or switch back to the installed ArtistAssistApp —
        you&apos;re logged in there too.
      </Trans>
    ),
  },
};

export function AuthFeedbackHandler({children}: Readonly<PropsWithChildren>) {
  const authError = useAppStore(state => state.authError);
  const authNotice = useAppStore(state => state.authNotice);

  const clearAuthError = useAppStore(state => state.clearAuthError);
  const clearAuthNotice = useAppStore(state => state.clearAuthNotice);
  const setActiveTabKey = useAppStore(state => state.setActiveTabKey);

  const {modal, notification} = App.useApp();

  const {t} = useLingui();

  useEffect(() => {
    if (!authError) {
      return;
    }
    const {title, content} = AUTH_ERRORS[authError.type] ?? {};
    const contextEntries = Object.entries(authError.context).filter(
      ([key, value]) => key in ERROR_CONTEXT_LABELS && value != null && value !== ''
    );
    const ctrl = modal.warning({
      title: title ?? t`Login failed`,
      content: (
        <>
          {content}
          {ERROR_TYPES_WITH_VISIBLE_CONTEXT.has(authError.type) && contextEntries.length > 0 && (
            <ul className="u-list-unstyled">
              {contextEntries.map(([key, value]) => (
                <li key={key}>
                  <Typography.Text strong>{ERROR_CONTEXT_LABELS[key]}</Typography.Text>
                  {': '}
                  {formatContextValue(value)}
                </li>
              ))}
            </ul>
          )}
        </>
      ),
      width: '100%',
      footer: null,
      closable: true,
      zIndex: 1200,
      afterClose: () => {
        clearAuthError();
        void setActiveTabKey(TabKey.ColorSet);
      },
    });
    return () => {
      ctrl.destroy();
    };
  }, [modal, authError, clearAuthError, setActiveTabKey, t]);

  useEffect(() => {
    if (!authNotice) {
      return;
    }
    const {title, description} = AUTH_NOTICES[authNotice] ?? {};
    notification.info({
      title,
      description,
      placement: 'top',
      duration: 10,
      showProgress: true,
    });
    clearAuthNotice();
  }, [notification, authNotice, clearAuthNotice]);

  return <>{children}</>;
}
