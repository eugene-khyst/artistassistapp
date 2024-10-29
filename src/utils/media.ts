/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

export enum DisplayMode {
  BROWSER = 'browser',
  STANDALONE = 'standalone',
  TWA = 'twa',
}

export function getDisplayMode(): DisplayMode {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  if (document.referrer.startsWith('android-app://')) {
    return DisplayMode.TWA;
  } else if (('standalone' in navigator && navigator.standalone) || isStandalone) {
    return DisplayMode.STANDALONE;
  }
  return DisplayMode.BROWSER;
}
