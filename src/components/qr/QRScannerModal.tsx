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

import {useLingui} from '@lingui/react/macro';
import type {IDetectedBarcode} from '@yudiel/react-qr-scanner';
import {Scanner} from '@yudiel/react-qr-scanner';
import {App, Modal, Space} from 'antd';
import type {PropsWithChildren} from 'react';
import {useEffect, useState} from 'react';

import {AUTH_URL} from '@/config';

import styles from './QRScannerModal.module.css';

interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export function QRScannerModal({open, setOpen, children}: Readonly<PropsWithChildren<Props>>) {
  const {message} = App.useApp();

  const {t} = useLingui();

  const [isPaused, setIsPaused] = useState<boolean>(true);

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setIsPaused(false);
    }
  }

  useEffect(() => {
    if (isPaused) {
      setOpen(false);
    }
  }, [isPaused, setOpen]);

  return (
    <Modal
      title={t`Scan a QR code`}
      centered
      open={open}
      footer={null}
      onCancel={() => {
        setIsPaused(true);
      }}
    >
      <Space orientation="vertical">
        {children}
        <div className={styles['scanner']}>
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
                if (
                  url.origin === window.location.origin ||
                  url.origin === new URL(AUTH_URL).origin
                ) {
                  window.location.assign(url.toString());
                  return;
                }
              } catch {
                // ignore
              }
              void message.info(t`Invalid QR code`);
            }}
          />
        </div>
      </Space>
    </Modal>
  );
}
