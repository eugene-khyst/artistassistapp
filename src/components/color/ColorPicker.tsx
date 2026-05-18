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
import {Button, ColorPicker as AntdColorPicker, Grid, theme, Typography} from 'antd';
import {type PropsWithChildren, useState} from 'react';

type Props = ColorPickerProps & {title?: string};

export function ColorPicker({children, title, ...props}: Readonly<PropsWithChildren<Props>>) {
  const screens = Grid.useBreakpoint();
  const {
    token: {colorTextTertiary, fontSizeLG},
  } = theme.useToken();

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
          <div style={{position: 'relative', paddingTop: 36}}>
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <Typography.Text ellipsis style={{flex: 1, minWidth: 0}}>
                {title}
              </Typography.Text>
              <Button
                type="text"
                size="middle"
                icon={<CloseOutlined style={{color: colorTextTertiary, fontSize: fontSizeLG}} />}
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
