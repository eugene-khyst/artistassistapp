/**
 * ArtistAssistApp
 * Copyright (C) 2023-2025  Eugene Khyst
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

import {FileImageOutlined, MoreOutlined, UploadOutlined} from '@ant-design/icons';
import {useLingui} from '@lingui/react/macro';
import {Button, Dropdown, Space} from 'antd';
import type {BaseButtonProps} from 'antd/es/button/button';
import type {MenuProps} from 'antd/lib';
import type {ChangeEvent, PropsWithChildren} from 'react';
import {useRef} from 'react';

import {useAppStore} from '~/src/stores/app-store';

type Props = {
  useReferencePhoto?: boolean;
  onChange: (files: File[]) => void;
} & Pick<BaseButtonProps, 'type'> &
  Pick<React.InputHTMLAttributes<HTMLInputElement>, 'accept' | 'multiple' | 'disabled'>;

export const FileSelect: React.FC<PropsWithChildren<Props>> = ({
  children,
  useReferencePhoto = false,
  onChange,
  type = 'primary',
  accept = 'image/*',
  disabled,
  ...props
}: PropsWithChildren<Props>) => {
  const originalImageFile = useAppStore(state => state.originalImageFile);

  const {t} = useLingui();

  const hiddenFileInput = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    hiddenFileInput.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const fileList: FileList | null = e.target.files;
    const files: File[] = fileList ? [...fileList] : [];
    onChange(files);
  };

  const items: MenuProps['items'] = [
    {
      key: '1',
      label: t`Use reference photo`,
      icon: <FileImageOutlined />,
      onClick: () => {
        onChange(originalImageFile ? [originalImageFile] : []);
      },
      disabled: !originalImageFile,
    },
  ];

  return (
    <>
      <Space.Compact>
        <Button type={type} icon={<UploadOutlined />} onClick={handleClick} disabled={disabled}>
          {children}
        </Button>
        {useReferencePhoto && (
          <Dropdown menu={{items}}>
            <Button icon={<MoreOutlined />} />
          </Dropdown>
        )}
      </Space.Compact>
      <input
        ref={hiddenFileInput}
        type="file"
        accept={accept}
        style={{display: 'none'}}
        onChange={handleFileChange}
        {...props}
      />
    </>
  );
};
