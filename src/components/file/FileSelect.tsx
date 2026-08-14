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
import {Trans} from '@lingui/react/macro';
import {App, Button, Dropdown, Grid, Space} from 'antd';
import type {BaseButtonProps} from 'antd/es/button/Button';
import type {MenuProps} from 'antd/lib';
import {
  type InputHTMLAttributes,
  type PropsWithChildren,
  type ReactNode,
  useCallback,
  useState,
} from 'react';
import {type Accept, type FileRejection, useDropzone} from 'react-dropzone';

import {imageFileToFile} from '@/services/image/image-file';
import {useAppStore} from '@/stores/app-store';
import {findAcceptedMimeType} from '@/utils/mime';

type Props = PropsWithChildren<
  {
    accept?: Accept;
    showUseReferencePhoto?: boolean;
    showUseCopiedImage?: boolean;
    onChange: (files: File[]) => void | Promise<void>;
  } & Pick<BaseButtonProps, 'loading' | 'type'> &
    Pick<InputHTMLAttributes<HTMLInputElement>, 'multiple' | 'disabled'>
>;

export function FileSelect({
  children,
  showUseReferencePhoto = false,
  showUseCopiedImage = false,
  onChange,
  type = 'primary',
  accept = {'image/*': []},
  disabled,
  loading,
  multiple,
}: Readonly<Props>) {
  const selectedImageFile = useAppStore(state => state.selectedImageFile);

  const [isLoading, setIsLoading] = useState(false);

  const screens = Grid.useBreakpoint();

  const {notification} = App.useApp();

  const withLoading = useCallback(async (action: () => Promise<void> | void): Promise<void> => {
    setIsLoading(true);
    try {
      await action();
    } finally {
      setIsLoading(false);
    }
  }, []);

  const emitFiles = useCallback(
    (files: File[]): Promise<void> => withLoading(() => onChange(files)),
    [onChange, withLoading]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      void emitFiles(acceptedFiles);

      for (const {file, errors} of fileRejections) {
        notification.error({
          title: file.name,
          description: (
            <>
              {errors.map(({code, message}) => (
                <div key={code}>{message}</div>
              ))}
            </>
          ),
          placement: 'top',
          duration: 10,
          showProgress: true,
        });
      }
    },
    [emitFiles, notification]
  );

  const busy = !!(disabled || loading || isLoading);

  const {getRootProps, getInputProps, inputRef, isDragActive} = useDropzone({
    noClick: true,
    accept,
    multiple: multiple ?? false,
    onDrop,
    disabled: busy,
  });

  const handleClick = () => {
    inputRef.current.click();
  };

  const handleClipboardImageClick = (): Promise<void> =>
    withLoading(async () => {
      let description: ReactNode;

      if ('clipboard' in navigator && 'read' in navigator.clipboard) {
        const files: File[] = [];
        description = <Trans>Copy a supported image to the clipboard, then try again.</Trans>;
        try {
          const clipboardItems: ClipboardItem[] = await navigator.clipboard.read();

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
        } catch {
          description = <Trans>Allow clipboard access, then try again.</Trans>;
          files.length = 0;
        }

        if (files.length) {
          await onChange(files);
          return;
        }
      } else {
        description = (
          <Trans>Your browser does not support reading images from the clipboard.</Trans>
        );
      }

      notification.error({
        title: <Trans>Cannot use copied image</Trans>,
        description,
        placement: 'top',
        duration: 10,
        showProgress: true,
      });
    });

  const items: MenuProps['items'] = [
    showUseReferencePhoto
      ? {
          key: 'use-reference',
          label: <Trans>Use reference photo</Trans>,
          icon: <FileImageOutlined />,
          onClick: () => {
            void emitFiles(selectedImageFile ? [imageFileToFile(selectedImageFile)] : []);
          },
          disabled: !selectedImageFile,
        }
      : null,
    showUseCopiedImage
      ? {
          key: 'use-copied-image',
          label: <Trans>Use copied image</Trans>,
          icon: <SnippetsOutlined />,
          onClick: () => {
            void handleClipboardImageClick();
          },
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
            loading={loading || isLoading}
          >
            {children}
          </Button>
          {(showUseReferencePhoto || showUseCopiedImage) && (
            <Dropdown menu={{items}} trigger={['click']}>
              <Button icon={<DownOutlined />} disabled={busy} />
            </Dropdown>
          )}
        </Space.Compact>
      )}
    </div>
  );
}
