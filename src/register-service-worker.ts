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

export function registerServiceWorker() {
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      void registerAndRefresh();
    });

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

async function registerAndRefresh() {
  try {
    const registration: ServiceWorkerRegistration = await navigator.serviceWorker.register(
      '/service-worker.js',
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
