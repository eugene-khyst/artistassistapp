/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {useAuth0} from '@auth0/auth0-react';
import {Button} from 'antd';
import type React from 'react';

export const LogoutButton: React.FC = () => {
  const {logout} = useAuth0();

  return (
    <Button onClick={() => void logout({logoutParams: {returnTo: window.location.origin}})}>
      Log out
    </Button>
  );
};
