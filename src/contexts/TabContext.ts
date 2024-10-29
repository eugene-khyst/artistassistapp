/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {createContext} from 'react';

import {TabKey} from '~/src/tabs';

export const TabContext = createContext(TabKey.ColorSet);
