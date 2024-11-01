/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
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
    return () => window.removeEventListener('unhandledrejection', promiseRejectionHandler);
  }, [notification]);

  return <>{children}</>;
};
