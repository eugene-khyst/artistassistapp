/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

export function disableScreenLock() {
  if ('wakeLock' in navigator) {
    window.addEventListener('load', () => {
      let wakeLock: WakeLockSentinel | null = null;
      const requestWakeLock = async () => {
        try {
          wakeLock = await navigator.wakeLock.request('screen');
        } catch (error) {
          console.error(error);
        }
      };
      document.addEventListener('click', () => {
        void requestWakeLock();
      });
      document.addEventListener('visibilitychange', () => {
        if (wakeLock !== null && document.visibilityState === 'visible') {
          void requestWakeLock();
        }
      });
    });
  }
}
