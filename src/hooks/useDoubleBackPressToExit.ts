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

import {useLingui} from '@lingui/react/macro';
import {App} from 'antd';
import {useEffect, useRef} from 'react';

export function useDoubleBackPressToExit() {
  const {message} = App.useApp();

  const {t} = useLingui();

  const backPressedOnce = useRef<boolean>(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!window.history.state) {
      window.history.pushState({}, '');
    }

    const handlePopState = () => {
      if (backPressedOnce.current) {
        return;
      }

      window.history.pushState({}, '');

      message.info(t`Press Back again to exit`, 3);
      backPressedOnce.current = true;

      timeoutRef.current = setTimeout(() => {
        backPressedOnce.current = false;
      }, 3000);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [message, t]);
}
