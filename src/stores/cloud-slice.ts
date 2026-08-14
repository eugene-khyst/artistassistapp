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

import {t} from '@lingui/core/macro';
import type {StateCreator} from 'zustand';

import {AuthError, ForceLogoutError} from '@/services/auth/errors';
import type {User} from '@/services/auth/types';
import * as CloudConnectionClient from '@/services/cloud/cloud-connection-client';
import * as CloudSyncClient from '@/services/cloud/cloud-sync-client';
import {CloudError, CloudErrorType} from '@/services/cloud/errors';
import {createStateZip, replaceStateFromZip, type StateZip} from '@/services/cloud/state-zip';
import {
  type CloudConnection,
  type CloudConnectionAttempt,
  type CloudProvider,
  type CloudSyncOptions,
  type CloudSyncProgress,
  type CloudSyncResult,
  CloudSyncType,
} from '@/services/cloud/types';
import {
  deleteCloudConnectionAttempt,
  deleteCloudConnectionAttemptIfVerifier,
  getCloudConnection,
  getCloudConnectionAttempt,
  saveCloudConnectionAttempt,
} from '@/services/db/cloud-connection-db';
import {readImageBytes} from '@/services/db/image-file-db';
import {ImageUnreadableError} from '@/services/image/errors';
import type {AppSlice} from '@/stores/app-slice';
import type {AuthSlice} from '@/stores/auth-slice';
import type {ColorSetSlice} from '@/stores/color-set-slice';
import type {CustomColorBrandSlice} from '@/stores/custom-color-brand-slice';
import type {OriginalImageSlice} from '@/stores/original-image-slice';
import type {PaletteSlice} from '@/stores/palette-slice';
import {reloadStores} from '@/stores/sync/store-reloads';
import {createAbortableOperation} from '@/utils/abortable-operation';
import {coalesceConcurrentCalls, dedupeConcurrentCalls} from '@/utils/concurrency';
import {createSha256Base64Url, randomBase64Url} from '@/utils/crypto';
import {abortablePromise} from '@/utils/promise';

const CLOUD_CONNECTION_FAILED_MESSAGE = 'Cloud connection failed';

export enum CloudOperationType {
  Connect = 'connect',
  Sync = 'sync',
  Upload = 'upload',
  Download = 'download',
  Disconnect = 'disconnect',
  ExportZip = 'export-zip',
  ImportZip = 'import-zip',
}

export type CloudOperation =
  | {type: CloudOperationType.Connect; provider?: CloudProvider}
  | {type: Exclude<CloudOperationType, CloudOperationType.Connect>};

export type RepairImageResult = 'deleted' | 'restored' | 'unavailable' | 'failed';

export interface CloudSlice {
  cloudConnection: CloudConnection | null;
  cloudError: CloudError | null;
  cloudSyncUpdateAvailable: boolean;
  cloudSyncPostponed: boolean;
  cloudOperation: CloudOperation | null;
  cloudSyncTip: string | null;
  abortCloudSync: (() => void) | null;

  loadCloudConnection: () => Promise<CloudConnection | null>;
  connectCloud: (provider: CloudProvider) => Promise<void>;
  handleCloudCallback: (completed: boolean, error?: CloudError | AuthError | null) => Promise<void>;
  refreshCloudConnection: () => Promise<void>;
  syncCloudState: () => Promise<void>;
  pushCloudState: () => Promise<void>;
  forceUploadCloudState: () => Promise<void>;
  forceDownloadCloudState: () => Promise<void>;
  checkCloudSyncUpdate: () => Promise<void>;
  dismissCloudSyncUpdate: () => void;
  postponeCloudSync: () => void;
  disconnectCloud: (permanent?: boolean) => Promise<boolean>;
  handleCloudError: (error: unknown, message: string) => Promise<void>;
  clearCloudError: () => void;
  repairImage: (digest: string) => Promise<RepairImageResult>;
  removeUnreadableImage: (digest: string) => Promise<void>;
  exportToZip: () => Promise<StateZip>;
  importFromZip: (file: File) => Promise<void>;
}

type CloudSliceDependencies = Pick<AuthSlice, 'auth' | 'logout' | 'handleAuthError'> &
  Pick<AppSlice, 'storeChangeTokens' | 'saveStoreChangeTokens'> &
  Pick<CustomColorBrandSlice, 'loadCustomColorBrands'> &
  Pick<ColorSetSlice, 'loadColorSets'> &
  Pick<OriginalImageSlice, 'recentImages' | 'loadRecentImages' | 'deleteRecentImage'> &
  Pick<PaletteSlice, 'loadPaletteColorMixtures'>;

export const createCloudSlice: StateCreator<
  CloudSlice & CloudSliceDependencies,
  [],
  [],
  CloudSlice
> = (set, get) => {
  const cloudSyncOperation = createAbortableOperation({
    onStart: () => {
      set({
        cloudSyncUpdateAvailable: false,
        cloudSyncTip: null,
        abortCloudSync: () => {
          cloudSyncOperation.abort();
        },
      });
    },
    onFinish: () => {
      set({
        cloudOperation: null,
        cloudSyncTip: null,
        abortCloudSync: null,
      });
    },
  });

  const onProgress = ({type, index, count}: CloudSyncProgress): void => {
    set({
      cloudSyncTip:
        type === CloudSyncType.Upload
          ? t`Uploading image ${index} / ${count}`
          : t`Downloading image ${index} / ${count}`,
    });
  };

  const runCloudSync = async (
    operation: (user: User, options?: CloudSyncOptions) => Promise<CloudSyncResult | null>,
    options?: CloudSyncOptions
  ): Promise<void> => {
    try {
      const {auth} = get();
      if (!auth?.user) {
        return;
      }
      const result = await operation(auth.user, options);
      if (!result) {
        set({
          cloudConnection: null,
          cloudSyncUpdateAvailable: false,
        });
        return;
      }
      if (result.type !== CloudSyncType.Unchanged) {
        set({
          cloudSyncUpdateAvailable: false,
        });
      }
      if (result.type === CloudSyncType.Download) {
        await reloadStores(get(), result.storeChangeTokens);
      }
      set({
        cloudError: null,
      });
    } catch (error) {
      if (options?.signal?.aborted) {
        return;
      }
      if (error instanceof ForceLogoutError) {
        void get().logout(error.type);
        return;
      }
      await get().handleCloudError(error, 'Could not sync cloud state');
    }
  };

  const createCloudSyncAction = (
    operation: (user: User, options?: CloudSyncOptions) => Promise<CloudSyncResult | null>,
    type: CloudOperationType.Sync | CloudOperationType.Upload | CloudOperationType.Download
  ): (() => Promise<void>) => {
    return async (): Promise<void> => {
      set({
        cloudSyncPostponed: false,
      });
      // Resolve on cancel so a new sync can start; the old run finishes in the background.
      await cloudSyncOperation.run(signal => {
        set({cloudOperation: {type}});
        return abortablePromise(runCloudSync(operation, {signal, onProgress}), signal);
      });
    };
  };

  return {
    cloudConnection: null,
    cloudError: null,
    cloudSyncUpdateAvailable: false,
    cloudSyncPostponed: false,
    cloudOperation: null,
    cloudSyncTip: null,
    abortCloudSync: null,

    loadCloudConnection: async (): Promise<CloudConnection | null> => {
      const cloudConnection: CloudConnection | null = (await getCloudConnection()) ?? null;
      set({
        cloudConnection,
        cloudSyncUpdateAvailable: false,
      });
      return cloudConnection;
    },

    connectCloud: async (provider: CloudProvider): Promise<void> => {
      set({
        cloudOperation: {type: CloudOperationType.Connect, provider},
      });
      try {
        const verifier = randomBase64Url(32);
        await saveCloudConnectionAttempt({
          verifier,
        });
        const challenge = await createSha256Base64Url(verifier);
        CloudConnectionClient.startCloudConnection(provider, challenge);
      } catch (error) {
        await deleteCloudConnectionAttempt();
        await get().handleCloudError(error, CLOUD_CONNECTION_FAILED_MESSAGE);
      } finally {
        set({
          cloudOperation: null,
        });
      }
    },

    handleCloudCallback: async (
      completed: boolean,
      error?: CloudError | AuthError | null
    ): Promise<void> => {
      set({
        cloudOperation: {type: CloudOperationType.Connect},
      });
      let attempt: CloudConnectionAttempt | undefined;
      try {
        attempt = await getCloudConnectionAttempt();
        if (error) {
          await get().handleCloudError(error, CLOUD_CONNECTION_FAILED_MESSAGE);
          return;
        }
        let cloudConnection: CloudConnection | null = null;
        if (completed) {
          cloudConnection = await CloudConnectionClient.restoreCloudConnection();
        } else {
          if (!attempt) {
            throw new CloudError(CloudErrorType.Unknown, 'Cloud connection attempt not found');
          }
          cloudConnection = await CloudConnectionClient.completeCloudConnection(attempt.verifier);
        }
        set({
          cloudConnection,
          cloudError: null,
          cloudSyncUpdateAvailable: false,
        });
      } catch (error) {
        await get().handleCloudError(error, CLOUD_CONNECTION_FAILED_MESSAGE);
      } finally {
        if (attempt) {
          await deleteCloudConnectionAttemptIfVerifier(attempt.verifier);
        }
        set({
          cloudOperation: null,
        });
      }
    },

    refreshCloudConnection: async (): Promise<void> => {
      try {
        const cloudConnection = await CloudConnectionClient.restoreCloudConnection();
        set({
          cloudConnection,
          cloudSyncUpdateAvailable: false,
        });
      } catch (error) {
        if (error instanceof CloudError && error.type === CloudErrorType.CloudConnectionNotFound) {
          set({
            cloudConnection: null,
            cloudSyncUpdateAvailable: false,
          });
          return;
        }
        throw error;
      }
    },

    syncCloudState: dedupeConcurrentCalls(
      createCloudSyncAction(CloudSyncClient.syncCloudState, CloudOperationType.Sync)
    ),

    pushCloudState: coalesceConcurrentCalls(async (): Promise<void> => {
      if (get().cloudSyncPostponed) {
        return;
      }
      await runCloudSync(CloudSyncClient.pushCloudState);
    }),

    forceUploadCloudState: dedupeConcurrentCalls(
      createCloudSyncAction(CloudSyncClient.uploadCloudState, CloudOperationType.Upload)
    ),

    forceDownloadCloudState: dedupeConcurrentCalls(
      createCloudSyncAction(CloudSyncClient.downloadCloudState, CloudOperationType.Download)
    ),

    checkCloudSyncUpdate: dedupeConcurrentCalls(async (): Promise<void> => {
      const {auth, cloudSyncUpdateAvailable, cloudConnection, cloudSyncPostponed} = get();
      if (cloudSyncUpdateAvailable || cloudSyncPostponed) {
        return;
      }
      if (!auth?.user || !cloudConnection) {
        set({
          cloudSyncUpdateAvailable: false,
        });
        return;
      }
      try {
        const cloudSyncUpdateAvailable = await CloudSyncClient.hasCloudDataChanged();
        set({
          cloudSyncUpdateAvailable,
        });
      } catch (error) {
        if (error instanceof ForceLogoutError) {
          void get().logout(error.type);
          return;
        }
        await get().handleCloudError(error, 'Could not check cloud data');
      }
    }),

    dismissCloudSyncUpdate: (): void => {
      set({
        cloudSyncUpdateAvailable: false,
      });
    },

    postponeCloudSync: (): void => {
      set({
        cloudSyncPostponed: true,
        cloudError: null,
      });
    },

    disconnectCloud: dedupeConcurrentCalls(async (permanent = false): Promise<boolean> => {
      set({
        cloudOperation: {type: CloudOperationType.Disconnect},
      });
      try {
        await get().refreshCloudConnection();
        const tokens = await CloudSyncClient.disconnectCloud(permanent);
        get().saveStoreChangeTokens(tokens);
        set({
          cloudConnection: null,
          cloudError: null,
          cloudSyncUpdateAvailable: false,
        });
        return true;
      } catch (error) {
        await get().handleCloudError(error, 'Could not disconnect cloud storage');
        return false;
      } finally {
        set({
          cloudOperation: null,
        });
      }
    }),

    handleCloudError: async (error: unknown, message: string): Promise<void> => {
      if (!error) {
        return;
      }
      const cloudError = CloudError.fromError(error, message);
      console.error(`[cloud-sync] ${message}`, cloudError);
      if (cloudError instanceof AuthError) {
        await get().handleAuthError(cloudError, message);
      } else {
        set({
          cloudError,
          ...(cloudError.type === CloudErrorType.CloudConnectionNotFound
            ? {
                cloudConnection: null,
                cloudSyncUpdateAvailable: false,
              }
            : {}),
        });
      }
    },

    clearCloudError: (): void => {
      set({
        cloudError: null,
      });
    },

    repairImage: async (digest: string): Promise<RepairImageResult> => {
      try {
        const result = await CloudSyncClient.repairCloudImage(digest);
        if (result.status === 'unavailable') {
          return 'unavailable';
        }
        if (result.status === 'deleted') {
          set(({recentImages}) => ({
            recentImages: recentImages.filter(image => image.digest !== digest),
          }));
          return 'deleted';
        }
        const {blob, tokens} = result.image;
        set(({recentImages}) => ({
          recentImages: recentImages.map(image =>
            image.digest === digest ? {...image, blob} : image
          ),
        }));
        get().saveStoreChangeTokens(tokens);
        return 'restored';
      } catch (error) {
        if (error instanceof ForceLogoutError) {
          void get().logout(error.type);
          return 'failed';
        }
        await get().handleCloudError(error, 'Could not restore the photo from cloud storage');
        return 'failed';
      }
    },

    removeUnreadableImage: async (digest: string): Promise<void> => {
      try {
        try {
          await readImageBytes({digest});
        } catch (error) {
          if (!(error instanceof ImageUnreadableError)) {
            throw error;
          }
          await get().deleteRecentImage(digest, {scheduleCloudPush: false});
        }
      } catch (error) {
        await get().handleCloudError(error, 'Could not delete the unavailable photo');
        return;
      }
      await get().syncCloudState();
    },

    exportToZip: async (): Promise<StateZip> => {
      set({
        cloudOperation: {type: CloudOperationType.ExportZip},
      });
      try {
        return await createStateZip();
      } finally {
        set({
          cloudOperation: null,
        });
      }
    },

    importFromZip: async (file: File): Promise<void> => {
      set({
        cloudOperation: {type: CloudOperationType.ImportZip},
      });
      try {
        const tokens = await replaceStateFromZip(file);
        await reloadStores(get(), tokens);
      } finally {
        set({
          cloudOperation: null,
        });
      }
    },
  };
};
