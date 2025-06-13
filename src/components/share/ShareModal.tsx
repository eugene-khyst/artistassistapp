/**
 * ArtistAssistApp
 * Copyright (C) 2023-2025  Eugene Khyst
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

import {CopyOutlined, ShareAltOutlined} from '@ant-design/icons';
import {Trans, useLingui} from '@lingui/react/macro';
import {App, Button, Input, Modal, Space, Typography} from 'antd';

import {QRCode} from '~/src/components/qr/QRCode';

const SHARE_AVAILABLE: boolean = 'share' in navigator;

interface Props {
  open: boolean;
  setOpen: (open: boolean) => void;
  url?: string;
}

export const ShareModal: React.FC<Props> = ({open, setOpen, url}: Props) => {
  const {message} = App.useApp();

  const {t} = useLingui();

  const handleCopyToClipboardClick = () => {
    if ('clipboard' in navigator && url) {
      void navigator.clipboard.writeText(url);
      void message.info(t`Link copied to clipboard`);
    }
  };

  const handleShareClick = async () => {
    if ('share' in navigator && url) {
      try {
        await navigator.share({
          title: 'ArtistAssistApp Color Set',
          url,
        });
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          throw error;
        }
      }
    }
  };

  return (
    <Modal
      title={t`Share your color set`}
      centered
      open={open}
      footer={null}
      onCancel={() => {
        setOpen(false);
      }}
    >
      {url ? (
        <Space direction="vertical" style={{display: 'flex'}}>
          <Typography.Text>
            <Trans>Copy and share this link</Trans>
          </Typography.Text>
          <Space.Compact style={{width: '100%'}}>
            <Input value={url} />
            {SHARE_AVAILABLE ? (
              <Button
                type="primary"
                icon={<ShareAltOutlined />}
                onClick={() => void handleShareClick()}
              >
                <Trans>Share</Trans>
              </Button>
            ) : (
              <Button icon={<CopyOutlined />} onClick={handleCopyToClipboardClick}>
                <Trans>Copy</Trans>
              </Button>
            )}
          </Space.Compact>
          <Typography.Text>
            <Trans>Or scan the QR code</Trans>
          </Typography.Text>
          <QRCode value={url} />
        </Space>
      ) : (
        <p>
          <Trans>Nothing to share</Trans>
        </p>
      )}
    </Modal>
  );
};
