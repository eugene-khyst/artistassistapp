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

import type {MessageDescriptor} from '@lingui/core';
import {useLingui} from '@lingui/react/macro';
import {App} from 'antd';
import {useEffect} from 'react';

import {AUTH_ERRORS} from '~/src/components/messages';
import {useAppStore} from '~/src/stores/app-store';
import {TabKey} from '~/src/tabs';

export function useHandleAuthError(): void {
  const authError = useAppStore(state => state.authError);

  const clearAuthError = useAppStore(state => state.clearAuthError);
  const setActiveTabKey = useAppStore(state => state.setActiveTabKey);

  const {modal} = App.useApp();

  const {t} = useLingui();

  useEffect(() => {
    void (async () => {
      if (authError) {
        const errorMessage: MessageDescriptor | undefined = AUTH_ERRORS[authError.type];
        const errorDescription: string = authError.message || '';
        await modal.warning({
          title: t`Login failed`,
          content: [errorMessage && t(errorMessage), errorDescription].filter(Boolean).join(' '),
          afterClose() {
            clearAuthError();
            void setActiveTabKey(TabKey.ColorSet);
          },
        });
      }
    })();
  }, [modal, authError, clearAuthError, setActiveTabKey, t]);
}
