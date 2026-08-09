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

import {DownloadOutlined} from '@ant-design/icons';
import {Plural, Trans} from '@lingui/react/macro';
import {App, Button} from 'antd';
import {saveAs} from 'file-saver';

import {getStateZipFilename} from '@/services/cloud/state-zip';
import {useAppStore} from '@/stores/app-store';
import {CloudOperationType} from '@/stores/cloud-slice';
import {getErrorMessage} from '@/utils/error';

const UNAVAILABLE_PHOTOS_NOTIFICATION_KEY = 'backup-unavailable-photos';

export function ExportToZipButton() {
  const cloudOperation = useAppStore(state => state.cloudOperation);
  const exportToZip = useAppStore(state => state.exportToZip);

  const {notification} = App.useApp();

  const handleExport = async () => {
    try {
      const {blob, unavailableImageCount} = await exportToZip();
      saveAs(blob, getStateZipFilename());
      if (unavailableImageCount > 0) {
        notification.warning({
          key: UNAVAILABLE_PHOTOS_NOTIFICATION_KEY,
          title: <Trans>Backup saved without some photos</Trans>,
          description: (
            <Plural
              value={unavailableImageCount}
              one="Backup created without # unavailable photo. Select the original photo again, then save the backup again."
              other="Backup created without # unavailable photos. Select the original photos again, then save the backup again."
            />
          ),
          placement: 'top',
          duration: 10,
          showProgress: true,
        });
      }
    } catch (error) {
      notification.error({
        title: <Trans>Could not export backup</Trans>,
        description: getErrorMessage(error),
        placement: 'top',
        duration: 10,
        showProgress: true,
      });
    }
  };

  return (
    <Button
      icon={<DownloadOutlined />}
      loading={cloudOperation?.type === CloudOperationType.ExportZip}
      disabled={!!cloudOperation && cloudOperation.type !== CloudOperationType.ExportZip}
      onClick={() => void handleExport()}
    >
      <Trans>Save backup</Trans>
    </Button>
  );
}
