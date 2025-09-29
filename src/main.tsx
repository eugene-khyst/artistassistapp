/**
 * ArtistAssistApp
 * Copyright (C) 2023-2025  Eugene Khyst
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

import './index.css';

import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {App} from 'antd';
import type {Root} from 'react-dom/client';
import {createRoot} from 'react-dom/client';
import {ErrorBoundary} from 'react-error-boundary';

import {AlertTimedReloadFallback} from '~/src/components/alert/AlertTimedReloadFallback';
import {BrowserSupport} from '~/src/components/alert/BrowserSupport';
import {PromiseErrorBoundary} from '~/src/components/alert/PromiseErrorBoundary';
import {InternationalizationProvider} from '~/src/contexts/InternationalizationProvider';
import {registerFileHandler} from '~/src/file-handler';
import type {BeforeInstallPromptEvent} from '~/src/pwa';
import {clearDatabase} from '~/src/services/db/db';
import {useAppStore} from '~/src/stores/app-store';
import {disableScreenLock} from '~/src/wake-lock';

import {ArtistAssistApp} from './ArtistAssistApp';
import {registerServiceWorker} from './register-service-worker';

const AUTH_VERIFICATION_INTERVAL = 5 * 60000;

void (async () => {
  registerServiceWorker();
  registerFileHandler();
  window.addEventListener('beforeinstallprompt', (event: BeforeInstallPromptEvent) => {
    event.preventDefault();
    useAppStore.getState().setBeforeInstallPromptEvent(event);
  });
  window.addEventListener('appinstalled', () => {
    useAppStore.getState().setBeforeInstallPromptEvent(null);
  });
  disableScreenLock();
  void clearDatabase();
  await useAppStore.getState().initAppStore();

  setInterval(() => {
    if (!useAppStore.getState().isAuthValid()) {
      window.location.reload();
    }
  }, AUTH_VERIFICATION_INTERVAL);

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        networkMode: 'offlineFirst',
        staleTime: 3 * 60 * 1000,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        refetchInterval: false,
        retry: false,
      },
    },
  });

  const root: Root = createRoot(document.getElementById('root')!);
  root.render(
    // <StrictMode>
    <InternationalizationProvider>
      <App>
        <ErrorBoundary FallbackComponent={AlertTimedReloadFallback}>
          <PromiseErrorBoundary>
            <BrowserSupport>
              <QueryClientProvider client={queryClient}>
                <ArtistAssistApp />
              </QueryClientProvider>
            </BrowserSupport>
          </PromiseErrorBoundary>
        </ErrorBoundary>
      </App>
    </InternationalizationProvider>
    // </StrictMode>
  );
})();
