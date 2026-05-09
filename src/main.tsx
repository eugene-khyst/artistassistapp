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

import './index.css';

import {QueryCache, QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {App} from 'antd';
import {StrictMode} from 'react';
import type {Root} from 'react-dom/client';
import {createRoot} from 'react-dom/client';
import {ErrorBoundary} from 'react-error-boundary';

import {ArtistAssistApp} from '~/src/ArtistAssistApp';
import {AuthErrorHandler} from '~/src/components/error/AuthErrorHandler';
import {BrowserSupport} from '~/src/components/error/BrowserSupport';
import {ErrorFallback} from '~/src/components/error/ErrorFallback';
import {InstanceConflictAlert} from '~/src/components/error/InstanceConflictAlert';
import {UnhandledRejectionHandler} from '~/src/components/error/UnhandledRejectionHandler';
import {ServiceWorkerUpdateNotification} from '~/src/components/pwa/ServiceWorkerUpdateNotification';
import {InternationalizationProvider} from '~/src/contexts/InternationalizationProvider';
import {UnsavedChangesProvider} from '~/src/contexts/UnsavedChangesContext';
import {initializePWA} from '~/src/pwa-init';
import {ForceLogoutError} from '~/src/services/auth/types';
import {runSingleInstanceOrConflict} from '~/src/single-instance';
import {useAppStore} from '~/src/stores/app-store';
import {disableScreenLock} from '~/src/wake-lock';

const root: Root = createRoot(document.getElementById('root')!);

async function renderApp(): Promise<void> {
  try {
    initializePWA();
    disableScreenLock();
    await useAppStore.getState().initApp();
  } catch (error) {
    useAppStore.getState().addInitError('initialize app', error);
  }

  const queryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: error => {
        if (error instanceof ForceLogoutError) {
          void useAppStore.getState().logout(error.reason);
        }
      },
    }),
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

  root.render(
    <StrictMode>
      <InternationalizationProvider>
        <App>
          <ServiceWorkerUpdateNotification />
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <UnhandledRejectionHandler>
              <AuthErrorHandler>
                <BrowserSupport>
                  <QueryClientProvider client={queryClient}>
                    <UnsavedChangesProvider>
                      <ArtistAssistApp />
                    </UnsavedChangesProvider>
                  </QueryClientProvider>
                </BrowserSupport>
              </AuthErrorHandler>
            </UnhandledRejectionHandler>
          </ErrorBoundary>
        </App>
      </InternationalizationProvider>
    </StrictMode>
  );
}

async function renderInstanceConflictAlert(): Promise<void> {
  try {
    await useAppStore.getState().initLocale();
  } catch (error) {
    useAppStore.getState().addInitError('initialize locale', error);
  }
  root.render(
    <StrictMode>
      <InternationalizationProvider>
        <App>
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <UnhandledRejectionHandler>
              <InstanceConflictAlert />
            </UnhandledRejectionHandler>
          </ErrorBoundary>
        </App>
      </InternationalizationProvider>
    </StrictMode>
  );
}

void runSingleInstanceOrConflict({
  onActiveInstance: renderApp,
  onConflict: renderInstanceConflictAlert,
});
