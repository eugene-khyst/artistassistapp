/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {useAuth0} from '@auth0/auth0-react';
import {Button} from 'antd';
import type React from 'react';

export const LoginButton: React.FC = () => {
  const {loginWithPopup} = useAuth0();

  return (
    <Button type="primary" onClick={() => void loginWithPopup()}>
      Log in with Patreon
    </Button>
  );
};
