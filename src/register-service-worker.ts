/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      void registerAndRefresh();

      window.history.pushState({}, '');
      window.addEventListener('popstate', () => {
        setTimeout(() => {
          window.history.pushState({}, '');
        }, 2000);
      });
    });

    if (process.env.NODE_ENV === 'production') {
      let refreshing: boolean;
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        if (refreshing) {
          return;
        }
        refreshing = true;
        window.location.reload();
      });
    }
  }
}

async function registerAndRefresh() {
  try {
    const registration: ServiceWorkerRegistration = await navigator.serviceWorker.register(
      new URL('service-worker.ts', import.meta.url),
      {
        type: 'module',
        updateViaCache: 'none',
      }
    );

    if (registration.waiting) {
      invokeServiceWorkerUpdateFlow(registration);
    }

    registration.addEventListener('updatefound', () => {
      if (registration.installing) {
        registration.installing.addEventListener('statechange', () => {
          if (registration.waiting) {
            if (navigator.serviceWorker.controller) {
              invokeServiceWorkerUpdateFlow(registration);
            }
          }
        });
      }
    });
  } catch (error) {
    console.log('Service worker registration failed', error);
  }
}

function invokeServiceWorkerUpdateFlow(registration: ServiceWorkerRegistration) {
  registration.waiting?.postMessage('skipWaiting');
}
