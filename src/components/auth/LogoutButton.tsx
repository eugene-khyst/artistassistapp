/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Button} from 'antd';
import type React from 'react';

import {useAuth} from '~/src/hooks/useAuth';

export const LogoutButton: React.FC = () => {
  const {logout} = useAuth();

  return <Button onClick={() => logout()}>Log out</Button>;
};
