/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {notification} from 'antd';
import {useEffect} from 'react';

type Props = {
  children: React.ReactNode;
};

export const PromiseErrorBoundary: React.FC<Props> = ({children}: Props) => {
  const [api, contextHolder] = notification.useNotification();

  useEffect(() => {
    const promiseRejectionHandler = ({reason}: PromiseRejectionEvent) => {
      let message = 'Unexpected error';
      let description: string | undefined;
      if (reason instanceof Error) {
        message = reason.toString();
        description = reason.stack?.toString();
      } else if (typeof reason === 'string') {
        message = reason;
      }
      api.error({
        message,
        description,
        placement: 'top',
        duration: 0,
      });
    };
    window.addEventListener('unhandledrejection', promiseRejectionHandler);
    return () => {
      window.removeEventListener('unhandledrejection', promiseRejectionHandler);
    };
  }, [api]);

  return (
    <>
      {contextHolder}
      {children}
    </>
  );
};
