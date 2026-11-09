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
import {Alert, Flex} from 'antd';

import {FileSelect} from '@/components/file/FileSelect';
import {TakePhoto} from '@/components/file/TakePhoto';

interface Props {
  loading: boolean;
  error: boolean;
  onChange: (files: File[]) => Promise<void>;
}

export function PhotoPicker({loading, error, onChange}: Readonly<Props>) {
  return (
    <>
      <Flex gap="small">
        <TakePhoto onChange={onChange} loading={loading} />
        <FileSelect type="default" onChange={onChange} loading={loading}>
          <Trans>Select photo</Trans>
        </FileSelect>
      </Flex>
      {error && (
        <Alert
          type="error"
          showIcon
          title={<Trans>Could not open this photo. Choose another one.</Trans>}
        />
      )}
    </>
  );
}
