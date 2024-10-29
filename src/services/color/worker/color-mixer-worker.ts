/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

/// <reference lib="WebWorker" />

import * as Comlink from 'comlink';

import {ColorMixer} from '..';

Comlink.expose(new ColorMixer());
