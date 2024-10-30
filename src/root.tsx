/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Auth0Provider} from '@auth0/auth0-react';
import * as Sentry from '@sentry/react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {App} from 'antd';
import {StrictMode} from 'react';
import type {Root} from 'react-dom/client';
import {createRoot} from 'react-dom/client';

import {registerFileHandler} from '~/src/file-handler';
import {confirmHistoryChange} from '~/src/history';
import {clearDatabase} from '~/src/services/db';
import {disableScreenLock} from '~/src/wake-lock';

import {ArtistAssistApp} from './ArtistAssistApp';
import {registerServiceWorker} from './register-service-worker';

Sentry.init({
  dsn: 'https://53a1df31d8df96056a1d07726d97ebfc@o4508211015254016.ingest.us.sentry.io/4508211020824576',
  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
    }),
  ],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
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
    <Auth0Provider
      domain="artistassistapp.us.auth0.com"
      clientId="oUflXrDaH0qMXfItkjdeoz4rLZXfkUwW"
      authorizationParams={{
        redirect_uri: window.location.origin,
        connection: 'Patreon',
      }}
      cacheLocation="localstorage"
    >
      <QueryClientProvider client={queryClient}>
        <App>
          <ArtistAssistApp />
        </App>
      </QueryClientProvider>
    </Auth0Provider>
  </StrictMode>
);
