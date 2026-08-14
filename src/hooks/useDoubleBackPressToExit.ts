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

import {App} from 'antd';
import {type ReactNode, useEffect, useEffectEvent, useRef} from 'react';

export function useDoubleBackPressToExit(content: ReactNode): void {
  const {message} = App.useApp();

  const backPressedOnceRef = useRef<boolean>(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const onPopState = useEffectEvent(() => {
    if (backPressedOnceRef.current) {
      return;
    }

    window.history.pushState({}, '');

    message.info(content, 3);
    backPressedOnceRef.current = true;

    timeoutRef.current = setTimeout(() => {
      backPressedOnceRef.current = false;
    }, 3000);
  });

  useEffect(() => {
    if (!window.history.state) {
      window.history.pushState({}, '');
    }

    window.addEventListener('popstate', onPopState);

    return () => {
      window.removeEventListener('popstate', onPopState);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
}
