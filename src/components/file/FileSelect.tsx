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

import {FileImageOutlined, InboxOutlined, MoreOutlined, UploadOutlined} from '@ant-design/icons';
import {useLingui} from '@lingui/react/macro';
import {App, Button, Dropdown, Space} from 'antd';
import type {BaseButtonProps} from 'antd/es/button/button';
import type {MenuProps} from 'antd/lib';
import type {PropsWithChildren} from 'react';
import {useCallback} from 'react';
import type {Accept, FileRejection} from 'react-dropzone';
import {useDropzone} from 'react-dropzone';

import {useAppStore} from '~/src/stores/app-store';

type Props = {
  accept?: Accept;
  useReferencePhoto?: boolean;
  onChange: (files: File[]) => void;
} & Pick<BaseButtonProps, 'type'> &
  Pick<React.InputHTMLAttributes<HTMLInputElement>, 'multiple' | 'disabled'>;

export const FileSelect: React.FC<PropsWithChildren<Props>> = ({
  children,
  useReferencePhoto = false,
  onChange,
  type = 'primary',
  accept = {'image/*': []},
  disabled,
  multiple,
}: PropsWithChildren<Props>) => {
  const originalImageFile = useAppStore(state => state.originalImageFile);

  const {notification} = App.useApp();

  const {t} = useLingui();

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      onChange(acceptedFiles);
      for (const {file, errors} of fileRejections) {
        notification.error({
          message: (
            <>
              {file.name}:<br />
              {errors.map(({message}) => (
                <>
                  {message}
                  <br />
                </>
              ))}
            </>
          ),
          placement: 'top',
        });
      }
    },
    [onChange, notification]
  );

  const {getRootProps, getInputProps, inputRef, isDragActive} = useDropzone({
    noClick: true,
    accept,
    multiple,
    onDrop,
  });

  const handleClick = () => {
    inputRef.current?.click();
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
      <div {...getRootProps()}>
        <input {...getInputProps()} />

        {!isDragActive ? (
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
        ) : (
          <Button color="primary" variant="dashed" icon={<InboxOutlined />}>
            Drop the {multiple ? 'files' : 'file'} here...
          </Button>
        )}
      </div>
    </>
  );
};
