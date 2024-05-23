/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {Alert, App} from 'antd';
import {StrictMode} from 'react';
import type {Root} from 'react-dom/client';
import {createRoot} from 'react-dom/client';

import {ArtistAssistApp} from './ArtistAssistApp';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchInterval: false,
    },
  },
});

const root: Root = createRoot(document.getElementById('root')!);
root.render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App message={{maxCount: 1, duration: 5, top: 100}}>
        <Alert.ErrorBoundary>
          <ArtistAssistApp />
        </Alert.ErrorBoundary>
      </App>
    </QueryClientProvider>
  </StrictMode>
);
