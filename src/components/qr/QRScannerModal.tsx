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

import type {IDetectedBarcode} from '@yudiel/react-qr-scanner';
import {Scanner} from '@yudiel/react-qr-scanner';
import {App, Modal} from 'antd';
import {useEffect, useState} from 'react';

interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const QRScannerModal: React.FC<Props> = ({open, setOpen}: Props) => {
  const {message} = App.useApp();

  const [isPaused, setIsPaused] = useState<boolean>(true);

  useEffect(() => {
    if (open) {
      setIsPaused(false);
    }
  }, [open]);

  useEffect(() => {
    if (isPaused) {
      setOpen(false);
    }
  }, [isPaused, setOpen]);

  return (
    <Modal
      title="Scan a QR code"
      centered
      open={open}
      footer={null}
      onCancel={() => {
        setIsPaused(true);
      }}
    >
      <div style={{minHeight: 472}}>
        <Scanner
          formats={['qr_code']}
          paused={isPaused}
          onScan={(result: IDetectedBarcode[]) => {
            const {rawValue} = result[0] ?? {};
            if (!rawValue) {
              return;
            }
            try {
              const url = new URL(rawValue);
              if (url.origin === window.location.origin) {
                window.location.assign(url.toString());
                return;
              }
            } catch {
              // ignore
            }
            void message.info('Invalid QR code');
          }}
        />
      </div>
    </Modal>
  );
};
