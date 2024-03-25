/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {UAParser} from 'ua-parser-js';

const {browser, os, ua}: UAParser.IResult = UAParser(navigator.userAgent);

export const userAgent = ua;

export const prettyUserAgent = [browser.name, browser.version, os.name && 'on', os.name, os.version]
  .filter(value => !!value)
  .join(' ');
