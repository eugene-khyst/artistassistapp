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

import {
  DownOutlined,
  FileImageOutlined,
  InboxOutlined,
  SnippetsOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import {Trans, useLingui} from '@lingui/react/macro';
import {App, Button, Dropdown, Grid, Space} from 'antd';
import type {BaseButtonProps} from 'antd/es/button/Button';
import type {MenuProps} from 'antd/lib';
import type {InputHTMLAttributes, PropsWithChildren} from 'react';
import {useCallback} from 'react';
import type {Accept, FileRejection} from 'react-dropzone';
import {useDropzone} from 'react-dropzone';

import {imageFileToFile} from '@/services/image/image-file';
import {useAppStore} from '@/stores/app-store';
import {findAcceptedMimeType} from '@/utils/mime';

type Props = {
  accept?: Accept;
  showUseReferencePhoto?: boolean;
  showUseCopiedImage?: boolean;
  onChange: (files: File[]) => void;
} & Pick<BaseButtonProps, 'type'> &
  Pick<InputHTMLAttributes<HTMLInputElement>, 'multiple' | 'disabled'>;

export function FileSelect({
  children,
  showUseReferencePhoto = false,
  showUseCopiedImage = false,
  onChange,
  type = 'primary',
  accept = {'image/*': []},
  disabled,
  multiple,
}: Readonly<PropsWithChildren<Props>>) {
  const imageFile = useAppStore(state => state.imageFile);

  const screens = Grid.useBreakpoint();

  const {notification} = App.useApp();

  const {t} = useLingui();

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      onChange(acceptedFiles);
      for (const {file, errors} of fileRejections) {
        notification.error({
          title: file.name,
          description: (
            <>
              {errors.map(({message}, index) => (
                <div key={index}>{message}</div>
              ))}
            </>
          ),
          placement: 'top',
          duration: 10,
          showProgress: true,
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
    disabled,
  });

  const handleClick = () => {
    inputRef.current.click();
  };

  const handleClipboardImageClick = async () => {
    let errorDescription: string;

    if ('clipboard' in navigator && 'read' in navigator.clipboard) {
      try {
        const clipboardItems: ClipboardItem[] = await navigator.clipboard.read();
        const files: File[] = [];

        for (const item of clipboardItems) {
          const type = findAcceptedMimeType(item.types, Object.keys(accept));
          if (!type) {
            continue;
          }

          const blob: Blob = await item.getType(type);
          files.push(
            new File([blob], `copied-image`, {
              type: blob.type || type,
              lastModified: Date.now(),
            })
          );

          if (!multiple) {
            break;
          }
        }

        if (files.length) {
          onChange(files);
          return;
        }

        errorDescription = t`Copy a supported image to the clipboard, then try again.`;
      } catch {
        errorDescription = t`Allow clipboard access, then try again.`;
      }
    } else {
      errorDescription = t`Your browser does not support reading images from the clipboard.`;
    }

    notification.error({
      title: t`Cannot use copied image`,
      description: errorDescription,
      placement: 'top',
      duration: 10,
      showProgress: true,
    });
  };

  const items: MenuProps['items'] = [
    showUseReferencePhoto
      ? {
          key: 'use-reference',
          label: t`Use reference photo`,
          icon: <FileImageOutlined />,
          onClick: () => {
            onChange(imageFile ? [imageFileToFile(imageFile)] : []);
          },
          disabled: disabled || !imageFile,
        }
      : null,
    showUseCopiedImage
      ? {
          key: 'use-copied-image',
          label: t`Use copied image`,
          icon: <SnippetsOutlined />,
          onClick: () => {
            void handleClipboardImageClick();
          },
          disabled,
        }
      : null,
  ];

  return (
    <div {...getRootProps()}>
      <input {...getInputProps()} />

      {isDragActive ? (
        <Button color="primary" variant="dashed" icon={screens.sm ? <InboxOutlined /> : null}>
          {multiple ? <Trans>Drop the files here...</Trans> : <Trans>Drop the file here...</Trans>}
        </Button>
      ) : (
        <Space.Compact>
          <Button
            type={type}
            icon={screens.sm ? <UploadOutlined /> : null}
            onClick={handleClick}
            disabled={disabled}
          >
            {children}
          </Button>
          {(showUseReferencePhoto || showUseCopiedImage) && (
            <Dropdown menu={{items}} trigger={['click']}>
              <Button icon={<DownOutlined />} />
            </Dropdown>
          )}
        </Space.Compact>
      )}
    </div>
  );
}
