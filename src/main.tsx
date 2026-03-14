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
import {StrictMode} from 'react';
import type {Root} from 'react-dom/client';
import {createRoot} from 'react-dom/client';
import {ErrorBoundary} from 'react-error-boundary';

import {ArtistAssistApp} from '~/src/ArtistAssistApp';
import {AlertTimedReloadFallback} from '~/src/components/alert/AlertTimedReloadFallback';
import {AuthErrorHandler} from '~/src/components/alert/AuthErrorHandler';
import {BrowserSupport} from '~/src/components/alert/BrowserSupport';
import {UnhandledRejectionHandler} from '~/src/components/alert/UnhandledRejectionHandler';
import {ServiceWorkerUpdateNotification} from '~/src/components/pwa/ServiceWorkerUpdateNotification';
import {InternationalizationProvider} from '~/src/contexts/InternationalizationProvider';
import {initializePWA} from '~/src/pwa-init';
import {clearDatabase} from '~/src/services/db/db';
import {useAppStore} from '~/src/stores/app-store';
import {disableScreenLock} from '~/src/wake-lock';

void (async () => {
  initializePWA();
  disableScreenLock();
  void clearDatabase();
  await useAppStore.getState().initAppStore();

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
    <StrictMode>
      <InternationalizationProvider>
        <App>
          <ServiceWorkerUpdateNotification />
          <ErrorBoundary FallbackComponent={AlertTimedReloadFallback}>
            <UnhandledRejectionHandler>
              <AuthErrorHandler>
                <BrowserSupport>
                  <QueryClientProvider client={queryClient}>
                    <ArtistAssistApp />
                  </QueryClientProvider>
                </BrowserSupport>
              </AuthErrorHandler>
            </UnhandledRejectionHandler>
          </ErrorBoundary>
        </App>
      </InternationalizationProvider>
    </StrictMode>
  );
})();
