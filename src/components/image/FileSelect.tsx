/**
 * ArtistAssistApp
 * Copyright (C) 2023-2024  Eugene Khyst
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

import {UploadOutlined} from '@ant-design/icons';
import {Button} from 'antd';
import type {BaseButtonProps} from 'antd/es/button/button';
import type {PropsWithChildren} from 'react';
import {useRef} from 'react';

type Props = Pick<BaseButtonProps, 'type'> &
  Pick<React.InputHTMLAttributes<HTMLInputElement>, 'accept' | 'onChange' | 'multiple'>;

export const FileSelect: React.FC<PropsWithChildren<Props>> = ({
  children,
  type = 'primary',
  accept = 'image/*',
  ...props
}: PropsWithChildren<Props>) => {
  const hiddenFileInput = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    hiddenFileInput.current?.click();
  };

  return (
    <>
      <Button type={type} icon={<UploadOutlined />} onClick={handleClick}>
        {children}
      </Button>
      <input
        ref={hiddenFileInput}
        type="file"
        accept={accept}
        style={{display: 'none'}}
        {...props}
      />
    </>
  );
};
