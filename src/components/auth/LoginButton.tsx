/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Button} from 'antd';
import type React from 'react';

import {useAuth} from '~/src/hooks/useAuth';

export const LoginButton: React.FC = () => {
  const {loginWithRedirect} = useAuth();

  return (
    <Button type="primary" onClick={() => loginWithRedirect()}>
      Log in with Patreon
    </Button>
  );
};
