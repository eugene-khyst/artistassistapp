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

import {CameraOutlined} from '@ant-design/icons';
import {Trans} from '@lingui/react/macro';
import {Button} from 'antd';
import {useRef} from 'react';

import {getOS, OS} from '@/utils/environment';

interface Props {
  onChange: (files: File[]) => void | Promise<void>;
  loading?: boolean;
}

export function TakePhoto({onChange, loading}: Readonly<Props>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const os = getOS();
  if (os !== OS.ANDROID && os !== OS.I_OS && os !== OS.I_PAD_OS) {
    return null;
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        disabled={loading}
        onChange={event => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = '';
          if (file) {
            void onChange([file]);
          }
        }}
      />
      <Button
        type="primary"
        icon={<CameraOutlined />}
        loading={loading}
        onClick={() => inputRef.current?.click()}
      >
        <Trans>Take a photo</Trans>
      </Button>
    </>
  );
}
