/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Button} from 'antd';
import type React from 'react';

import {PATREON_URL} from '~/src/config';

export const JoinButton: React.FC = () => {
  return (
    <Button type="primary" href={PATREON_URL} target="_blank">
      Join on Patreon
    </Button>
  );
};
