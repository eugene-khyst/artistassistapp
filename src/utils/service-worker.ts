/**
 * ArtistAssistApp
 * Copyright (C) 2023-2026  Eugene Khyst
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

type ServiceWorkerUpdateHandler = (registration: ServiceWorkerRegistration) => void;

export function registerServiceWorker(onUpdateFound: ServiceWorkerUpdateHandler): void {
  if (!import.meta.env.DEV && 'serviceWorker' in navigator) {
    void registerAndRefresh(onUpdateFound);
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (refreshing) {
        return;
      }
      refreshing = true;
      window.location.reload();
    });
  }
}

async function registerAndRefresh(onUpdateFound: ServiceWorkerUpdateHandler): Promise<void> {
  try {
    const registration: ServiceWorkerRegistration = await navigator.serviceWorker.register(
      '/service-worker.js',
      {
        type: 'module',
        updateViaCache: 'none',
      }
    );
    if (registration.waiting) {
      onUpdateFound(registration);
    }
    registration.addEventListener('updatefound', () => {
      if (registration.installing) {
        registration.installing.addEventListener('statechange', () => {
          if (registration.waiting) {
            if (navigator.serviceWorker.controller) {
              onUpdateFound(registration);
            }
          }
        });
      }
    });
  } catch (error) {
    console.error('Service worker registration failed', error);
  }
}
