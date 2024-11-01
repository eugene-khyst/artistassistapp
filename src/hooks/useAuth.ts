/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {useContext} from 'react';

import {AuthContext} from '~/src/contexts/AuthContext';

export const useAuth = () => {
  return useContext(AuthContext);
};
