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

import {Trans} from '@lingui/react/macro';
import {App, Button, Flex} from 'antd';
import type {PropsWithChildren, ReactNode} from 'react';
import {useEffect} from 'react';

import {CloudErrorType} from '@/services/cloud/errors';
import {useAppStore} from '@/stores/app-store';
import {CloudOperationType} from '@/stores/cloud-slice';

function KeepThisDeviceButton() {
  const forceUploadCloudState = useAppStore(state => state.forceUploadCloudState);
  const cloudOperation = useAppStore(state => state.cloudOperation);

  const isUploading = cloudOperation?.type === CloudOperationType.Upload;
  return (
    <Button
      type="primary"
      onClick={() => void forceUploadCloudState()}
      loading={isUploading}
      disabled={!!cloudOperation && !isUploading}
    >
      <Trans>Keep this device</Trans>
    </Button>
  );
}

function KeepCloudDataButton({children}: Readonly<PropsWithChildren>) {
  const forceDownloadCloudState = useAppStore(state => state.forceDownloadCloudState);
  const cloudOperation = useAppStore(state => state.cloudOperation);

  const isDownloading = cloudOperation?.type === CloudOperationType.Download;
  return (
    <Button
      type="primary"
      onClick={() => void forceDownloadCloudState()}
      loading={isDownloading}
      disabled={!!cloudOperation && !isDownloading}
    >
      {children ?? <Trans>Keep cloud data</Trans>}
    </Button>
  );
}

function PostponeButton() {
  const postponeCloudSync = useAppStore(state => state.postponeCloudSync);
  const cloudOperation = useAppStore(state => state.cloudOperation);
  return (
    <Button onClick={postponeCloudSync} disabled={!!cloudOperation}>
      <Trans>Postpone</Trans>
    </Button>
  );
}

const CLOUD_ERRORS: Record<
  CloudErrorType,
  {
    title: ReactNode;
    content: ReactNode;
    footer?: ReactNode;
  }
> = {
  [CloudErrorType.ConnectionFailed]: {
    title: <Trans>Cloud connection failed</Trans>,
    content: (
      <Trans>The cloud connection could not be completed. Start again from ArtistAssistApp.</Trans>
    ),
  },
  [CloudErrorType.CloudConnectionNotFound]: {
    title: <Trans>Cloud not connected</Trans>,
    content: <Trans>Connect cloud storage before syncing.</Trans>,
  },
  [CloudErrorType.AuthorizationFailed]: {
    title: <Trans>Cloud authorization failed</Trans>,
    content: (
      <Trans>
        ArtistAssistApp can no longer access your cloud storage. Disconnect it, then connect again.
      </Trans>
    ),
  },
  [CloudErrorType.CloudAccessDenied]: {
    title: <Trans>Cloud access not granted</Trans>,
    content: (
      <Trans>
        Cloud storage was not connected because access was not granted. To connect it, try again and
        allow the requested access.
      </Trans>
    ),
  },
  [CloudErrorType.OtherUserChanges]: {
    title: <Trans>Unsynced changes on this device</Trans>,
    content: (
      <Trans>
        This device has changes made while another account was active. Keep this device to upload
        them to the current account, keep the cloud data to discard them, or postpone the decision.
      </Trans>
    ),
    footer: [
      <PostponeButton key="postpone" />,
      <KeepThisDeviceButton key="keep-local" />,
      <KeepCloudDataButton key="keep-cloud" />,
    ],
  },
  [CloudErrorType.SyncConflict]: {
    title: <Trans>Cloud sync conflict</Trans>,
    content: (
      <Trans>
        This device and the synchronized cloud data both changed. Choose which one to keep.
      </Trans>
    ),
    footer: [
      <PostponeButton key="postpone" />,
      <KeepThisDeviceButton key="keep-local" />,
      <KeepCloudDataButton key="keep-cloud" />,
    ],
  },
  [CloudErrorType.NoSyncHistory]: {
    title: <Trans>Cloud sync history missing</Trans>,
    content: (
      <Trans>
        This device has local data and existing synchronized cloud data, but no sync history. Choose
        which one to keep.
      </Trans>
    ),
    footer: [
      <PostponeButton key="postpone" />,
      <KeepThisDeviceButton key="keep-local" />,
      <KeepCloudDataButton key="keep-cloud" />,
    ],
  },
  [CloudErrorType.CloudDataNotFound]: {
    title: <Trans>Cloud data not found</Trans>,
    content: (
      <Trans>
        Some synchronized cloud data was deleted or is unavailable. Keep this device to create it
        again, or postpone the decision. ArtistAssistApp will not recreate it automatically.
      </Trans>
    ),
    footer: [<PostponeButton key="postpone" />, <KeepThisDeviceButton key="keep-local" />],
  },
  [CloudErrorType.CloudDataDeletionFailed]: {
    title: <Trans>Cloud files may remain</Trans>,
    content: (
      <Trans>
        ArtistAssistApp could not confirm that your cloud files were deleted. Remove any remaining
        ArtistAssistApp folder or files directly from your cloud provider.
      </Trans>
    ),
  },
  [CloudErrorType.CorruptedCloudData]: {
    title: <Trans>Cloud data unreadable</Trans>,
    content: (
      <Trans>The cloud data file is damaged. Replace it with the data from this device.</Trans>
    ),
    footer: [<PostponeButton key="postpone" />, <KeepThisDeviceButton key="keep-local" />],
  },
  [CloudErrorType.Network]: {
    title: <Trans>Cloud sync paused</Trans>,
    content: (
      <Trans>
        Your cloud storage couldn&apos;t be reached. Your latest changes remain saved on this device
        and have not been uploaded. Check your internet connection, then try syncing again.
      </Trans>
    ),
  },
  [CloudErrorType.RateLimited]: {
    title: <Trans>Too many requests</Trans>,
    content: <Trans>Wait a minute and try again.</Trans>,
  },
  [CloudErrorType.Unknown]: {
    title: <Trans>Cloud sync failed</Trans>,
    content: <Trans>Update ArtistAssistApp to the latest version and try again.</Trans>,
  },
};

export function CloudFeedbackHandler({children}: Readonly<PropsWithChildren>) {
  const cloudError = useAppStore(state => state.cloudError);

  const clearCloudError = useAppStore(state => state.clearCloudError);

  const {modal, notification} = App.useApp();

  useEffect(() => {
    if (!cloudError) {
      return;
    }
    console.error(cloudError);
    const {title, content, footer} = CLOUD_ERRORS[cloudError.type];
    // A notification is fire-and-forget, so the error clears immediately;
    // a modal represents an unresolved state and stays until a footer action resets cloudError.
    if (!footer) {
      notification.error({
        key: cloudError.type,
        title,
        description: content,
        placement: 'top',
        duration: 10,
        showProgress: true,
      });
      clearCloudError();
      return;
    }
    const ctrl = modal.error({
      title,
      content,
      width: '100%',
      footer: footer ? (
        <Flex gap="small" justify="flex-end" wrap>
          {footer}
        </Flex>
      ) : null,
      closable: false,
      mask: {closable: false},
      keyboard: false,
      zIndex: 1200,
    });
    return () => {
      ctrl.destroy();
    };
  }, [modal, notification, cloudError, clearCloudError]);

  return <>{children}</>;
}
