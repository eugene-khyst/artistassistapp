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

import './index.css';

import * as Sentry from '@sentry/react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {Alert, App} from 'antd';
import {StrictMode} from 'react';
import type {Root} from 'react-dom/client';
import {createRoot} from 'react-dom/client';

import {BrowserSupport} from '~/src/components/alert/BrowserSupport';
import {PromiseErrorBoundary} from '~/src/components/alert/PromiseErrorBoundary';
import {AuthProvider} from '~/src/contexts/AuthProvider';
import {registerFileHandler} from '~/src/file-handler';
import {confirmHistoryChange} from '~/src/history';
import {clearDatabase} from '~/src/services/db';
import {disableScreenLock} from '~/src/wake-lock';

import {ArtistAssistApp} from './ArtistAssistApp';
import {registerServiceWorker} from './register-service-worker';

Sentry.init({
  dsn: 'https://53a1df31d8df96056a1d07726d97ebfc@o4508211015254016.ingest.us.sentry.io/4508211020824576',
  integrations: [],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

void import('@sentry/react').then(lazyLoadedSentry => {
  Sentry.addIntegration(
    lazyLoadedSentry.replayIntegration({
      maskAllText: false,
    })
  );
});

registerServiceWorker();
registerFileHandler();
disableScreenLock();
confirmHistoryChange();
void clearDatabase();

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
    <App>
      <Alert.ErrorBoundary>
        <PromiseErrorBoundary>
          <BrowserSupport>
            <QueryClientProvider client={queryClient}>
              <AuthProvider
                domain="https://auth.artistassistapp.com"
                redirectUri={window.location.origin}
                issuer="https://auth.artistassistapp.com"
                audience="https://app.artistassistapp.com"
              >
                <ArtistAssistApp />
              </AuthProvider>
            </QueryClientProvider>
          </BrowserSupport>
        </PromiseErrorBoundary>
      </Alert.ErrorBoundary>
    </App>
  </StrictMode>
);