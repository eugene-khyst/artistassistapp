/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {App} from 'antd';
import {StrictMode} from 'react';
import type {Root} from 'react-dom/client';
import {createRoot} from 'react-dom/client';

import {registerFileHandler} from '~/src/file-handler';
import {confirmHistoryChange} from '~/src/history';
import {clearDatabase} from '~/src/services/db';
import {initAppStore} from '~/src/stores/app-store';
import {disableScreenLock} from '~/src/wake-lock';

import {ArtistAssistApp} from './ArtistAssistApp';
import {registerServiceWorker} from './register-service-worker';

registerServiceWorker();
registerFileHandler();
disableScreenLock();
confirmHistoryChange();
void clearDatabase();
void initAppStore();

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
    <QueryClientProvider client={queryClient}>
      <App>
        <ArtistAssistApp />
      </App>
    </QueryClientProvider>
  </StrictMode>
);
