/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

export function confirmHistoryChange() {
  window.addEventListener('load', () => {
    if (!window.history.state) {
      window.history.pushState({}, '');
    }
    const confirmBack = () => {
      if (confirm('Are you sure you want to exit?')) {
        window.removeEventListener('popstate', confirmBack);
        window.history.back();
      } else {
        window.history.pushState({}, '');
      }
    };
    window.addEventListener('popstate', confirmBack);
  });
}
