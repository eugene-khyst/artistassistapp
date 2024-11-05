/**
 * ArtistAssistApp
 * Copyright (C) 2023-2024  Eugene Khyst
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
import type {PropsWithChildren} from 'react';
import {useEffect} from 'react';

export const PromiseErrorBoundary: React.FC<PropsWithChildren> = ({
  children,
}: PropsWithChildren) => {
  const {notification} = App.useApp();

  useEffect(() => {
    const promiseRejectionHandler = ({reason}: PromiseRejectionEvent) => {
      let message = 'Unexpected error';
      if (reason instanceof Error) {
        message = reason.toString();
      } else if (typeof reason === 'string') {
        message = reason;
      }
      notification.error({
        message,
        placement: 'top',
        duration: 0,
      });
    };
    window.addEventListener('unhandledrejection', promiseRejectionHandler);
    return () => {
      window.removeEventListener('unhandledrejection', promiseRejectionHandler);
    };
  }, [notification]);

  return <>{children}</>;
};
