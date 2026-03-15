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
import {App, Divider, Typography} from 'antd';
import type {PropsWithChildren} from 'react';
import {useEffect} from 'react';

import {useAppStore} from '~/src/stores/app-store';
import {TabKey} from '~/src/tabs';

type AuthErrorMessage = Pick<ModalFuncProps, 'title' | 'content'>;

const AUTH_ERRORS: Record<string, AuthErrorMessage> = {
  inactive: {
    title: <Trans>Patreon membership verification failed</Trans>,
    content: (
      <Typography>
        <Typography.Paragraph>
          <Trans>
            This usually happens when you&apos;re signed in to a{' '}
            <Typography.Text strong>different</Typography.Text> Patreon account than the one used
            for your ArtistAssistApp membership.
          </Trans>
        </Typography.Paragraph>
        <Typography.Paragraph strong>
          <Trans>To fix this:</Trans>
        </Typography.Paragraph>
        <Typography.Paragraph>
          <ol>
            <li>
              <Trans>
                <Typography.Text strong>Check your Patreon account</Typography.Text>: Ensure you are
                signed in to{' '}
                <Typography.Link href="https://patreon.com" target="_blank" rel="noopener">
                  Patreon.com
                </Typography.Link>{' '}
                in your web browser using the same email you used to purchase your membership. If
                you have multiple accounts, sign out and sign back in with the correct one.
              </Trans>
            </li>
            <li>
              <Trans>
                <Typography.Text strong>Use a web browser</Typography.Text>: If you are using the
                Patreon app (iOS/Android), log in via a web browser (Chrome, Safari, Firefox)
                instead, as the app can sometimes interfere with the verification process.
              </Trans>
            </li>
            <li>
              <Trans>
                <Typography.Text strong>Retry login</Typography.Text>: Once you have confirmed the
                correct Patreon account is active in your browser, log in to ArtistAssistApp again.
              </Trans>
            </li>
          </ol>
        </Typography.Paragraph>
        <Typography.Paragraph>
          Still having trouble? Please refer to this{' '}
          <Typography.Link
            href="https://www.patreon.com/posts/having-trouble-115178129"
            target="_blank"
            rel="noopener"
          >
            troubleshooting guide
          </Typography.Link>
          .
        </Typography.Paragraph>
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
        const errorMessage: string = authError.message;
        await modal.warning({
          title: title ?? t`Login failed`,
          content: (
            <>
              {content}
              {content && errorMessage && <Divider size="small" />}
              {errorMessage && <div style={{whiteSpace: 'pre-line'}}>{errorMessage}</div>}
            </>
          ),
          width: '100%',
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
