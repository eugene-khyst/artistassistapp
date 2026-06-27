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

import {Trans} from '@lingui/react/macro';
import {useDevices} from '@yudiel/react-qr-scanner';
import {Typography} from 'antd';

import {QRScannerButton} from '@/components/qr/QRScannerButton';

export function LoginWithQRButton() {
  const mediaDevices: MediaDeviceInfo[] = useDevices();
  return (
    !!mediaDevices.length && (
      <QRScannerButton
        type="primary"
        modalContent={
          <Typography.Paragraph className="u-m-0">
            <ol className="u-m-0">
              <li>
                <Trans>Open the app on a device where you are logged in</Trans>
              </li>
              <li>
                <Trans>
                  Press <Typography.Text strong>Show login QR code</Typography.Text>
                </Trans>
              </li>
              <li>
                <Trans>Scan its QR code here</Trans>
              </li>
            </ol>
          </Typography.Paragraph>
        }
      >
        <Trans>Log in with QR code</Trans>
      </QRScannerButton>
    )
  );
}
