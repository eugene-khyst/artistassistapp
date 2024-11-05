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

import {LoginOutlined} from '@ant-design/icons';
import {Button} from 'antd';
import type React from 'react';

import {useAuth} from '~/src/hooks/useAuth';

export const LoginButton: React.FC = () => {
  const {loginWithRedirect} = useAuth();

  return (
    <Button
      type="primary"
      icon={<LoginOutlined />}
      onClick={() => {
        loginWithRedirect();
      }}
    >
      Log in with Patreon
    </Button>
  );
};
