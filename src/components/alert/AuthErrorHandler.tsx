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
import type {ModalFuncProps} from 'antd';
import {App, Typography} from 'antd';
import type {PropsWithChildren, ReactNode} from 'react';
import {useEffect} from 'react';

import {useAppStore} from '~/src/stores/app-store';
import {TabKey} from '~/src/tabs';

type AuthErrorMessage = Pick<ModalFuncProps, 'title' | 'content'>;

const ERROR_CONTEXT_LABELS: Record<string, ReactNode> = {
  email: <Trans>Email</Trans>,
  patron_status: <Trans>Patron status</Trans>,
  last_charge_status: <Trans>Last charge status</Trans>,
  next_charge_date: <Trans>Next charge date</Trans>,
  is_gifted: <Trans>Gifted membership</Trans>,
};

const AUTH_ERRORS: Record<string, AuthErrorMessage> = {
  inactive: {
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
          <Trans>
            Still having trouble? Please refer to this{' '}
            <Typography.Link
              href="https://www.patreon.com/posts/having-trouble-115178129"
              target="_blank"
              rel="noopener"
            >
              troubleshooting guide
            </Typography.Link>
            .
          </Trans>
        </p>
      </Typography>
    ),
  },
  expired: {
    title: <Trans>Session expired</Trans>,
    content: (
      <Trans>
        Your login session has expired. Please sign in again to refresh your access and continue
        using ArtistAssistApp.
      </Trans>
    ),
  },
  invalid_token: {
    title: <Trans>Authentication error</Trans>,
    content: (
      <Trans>
        We encountered a problem verifying your login credentials. This issue can usually be
        resolved by trying to log in again.
      </Trans>
    ),
  },
};

export const AuthErrorHandler: React.FC<PropsWithChildren> = ({children}: PropsWithChildren) => {
  const authError = useAppStore(state => state.authError);

  const clearAuthError = useAppStore(state => state.clearAuthError);
  const setActiveTabKey = useAppStore(state => state.setActiveTabKey);

  const {modal} = App.useApp();

  const {t} = useLingui();

  useEffect(() => {
    void (async () => {
      if (authError) {
        const {title, content} = AUTH_ERRORS[authError.type] ?? {};
        const contextEntries = authError.context
          ? Object.entries(authError.context).filter(
              ([key, value]) => key in ERROR_CONTEXT_LABELS && (value || value === 0)
            )
          : [];
        await modal.warning({
          title: title ?? t`Login failed`,
          content: (
            <>
              {content}
              {contextEntries.length > 0 && (
                <>
                  <p>
                    <Typography.Text strong>
                      <Trans>Your account details:</Trans>
                    </Typography.Text>
                  </p>
                  <ul style={{listStyle: 'none', padding: 0}}>
                    {contextEntries.map(([key, value]) => (
                      <li key={key}>
                        <Typography.Text strong>{ERROR_CONTEXT_LABELS[key]}</Typography.Text>
                        {': '}
                        {typeof value === 'string' ||
                        typeof value === 'number' ||
                        typeof value === 'boolean'
                          ? String(value)
                          : JSON.stringify(value)}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          ),
          width: '100%',
          footer: null,
          closable: true,
          afterClose() {
            clearAuthError();
            void setActiveTabKey(TabKey.ColorSet);
          },
        });
      }
    })();
  }, [modal, authError, clearAuthError, setActiveTabKey, t]);

  return <>{children}</>;
};
