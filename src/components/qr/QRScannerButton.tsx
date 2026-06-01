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

import {Button} from 'antd';
import type {ButtonProps} from 'antd/lib';
import type {PropsWithChildren, ReactNode} from 'react';
import {useState} from 'react';

import {QRScannerModal} from '~/src/components/qr/QRScannerModal';

type Props = ButtonProps & {
  modalContent?: ReactNode;
};

export function QRScannerButton({
  modalContent,
  children,
  onClick,
  ...props
}: Readonly<PropsWithChildren<Props>>) {
  const [open, setOpen] = useState<boolean>(false);
  return (
    <>
      <Button
        onClick={e => {
          onClick?.(e);
          setOpen(true);
        }}
        {...props}
      >
        {children}
      </Button>
      <QRScannerModal open={open} setOpen={setOpen}>
        {modalContent}
      </QRScannerModal>
    </>
  );
}
