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
import {App} from 'antd';

import {FileSelect} from '@/components/file/FileSelect';
import {FileExtension} from '@/services/cloud/types';
import {useAppStore} from '@/stores/app-store';
import {CloudOperationType} from '@/stores/cloud-slice';
import {getErrorMessage} from '@/utils/error';

export function ImportFromZipFileSelect() {
  const cloudOperation = useAppStore(state => state.cloudOperation);
  const importFromZip = useAppStore(state => state.importFromZip);

  const {message, modal, notification} = App.useApp();

  const handleImport = async ([file]: File[]) => {
    if (!file) {
      return;
    }
    const confirmed = await modal.confirm({
      title: <Trans>Import backup?</Trans>,
      content: (
        <Trans>
          Importing this backup will replace your local color sets, reference photos, saved color
          mixtures, and custom color brands.
        </Trans>
      ),
      okText: <Trans>Import backup</Trans>,
      cancelText: <Trans>Cancel</Trans>,
      focusTriggerAfterClose: false,
    });
    if (!confirmed) {
      return;
    }

    try {
      await importFromZip(file);
      void message.success(<Trans>Backup imported</Trans>);
    } catch (error) {
      notification.error({
        title: <Trans>Could not import backup</Trans>,
        description: getErrorMessage(error),
        placement: 'top',
        duration: 10,
        showProgress: true,
      });
    }
  };

  return (
    <FileSelect
      accept={{
        'application/zip': [FileExtension.State, '.zip'],
      }}
      type="default"
      loading={cloudOperation?.type === CloudOperationType.ImportZip}
      disabled={!!cloudOperation}
      onChange={handleImport}
    >
      <Trans>Restore backup</Trans>
    </FileSelect>
  );
}
