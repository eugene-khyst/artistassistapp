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

import {CloseOutlined} from '@ant-design/icons';
import type {ColorPickerProps} from 'antd';
import {Button, ColorPicker as AntdColorPicker, Grid, Typography} from 'antd';
import {type PropsWithChildren, useState} from 'react';

import styles from './ColorPicker.module.css';

type Props = ColorPickerProps & {title?: string};

export function ColorPicker({children, title, ...props}: Readonly<PropsWithChildren<Props>>) {
  const screens = Grid.useBreakpoint();

  const [internalOpen, setInternalOpen] = useState<boolean>(false);

  const isOpenControlled = props.open !== undefined;
  const open = isOpenControlled ? props.open : internalOpen;

  const handleOpenChange = (value: boolean) => {
    if (!isOpenControlled) {
      setInternalOpen(value);
    }
    props.onOpenChange?.(value);
  };

  return (
    <AntdColorPicker
      {...props}
      open={open}
      onOpenChange={handleOpenChange}
      panelRender={panel =>
        screens.md ? (
          panel
        ) : (
          <div className={styles['mobilePanel']}>
            <div className={styles['mobileHeader']}>
              <Typography.Text ellipsis className={styles['mobileTitle']}>
                {title}
              </Typography.Text>
              <Button
                type="text"
                size="middle"
                icon={<CloseOutlined className={styles['closeIcon']} />}
                onClick={() => {
                  handleOpenChange(false);
                }}
              />
            </div>
            {panel}
          </div>
        )
      }
    >
      {children}
    </AntdColorPicker>
  );
}
