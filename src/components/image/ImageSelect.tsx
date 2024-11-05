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
import type {PropsWithChildren} from 'react';
import {useRef} from 'react';

type Props = Pick<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'multiple'>;

export const ImageSelect: React.FC<PropsWithChildren<Props>> = ({
  children,
  ...props
}: PropsWithChildren<Props>) => {
  const hiddenFileInput = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    hiddenFileInput.current?.click();
  };

  return (
    <>
      <Button type="primary" icon={<UploadOutlined />} onClick={handleClick}>
        {children}
      </Button>
      <input
        ref={hiddenFileInput}
        type="file"
        accept="image/*"
        style={{display: 'none'}}
        {...props}
      />
    </>
  );
};
