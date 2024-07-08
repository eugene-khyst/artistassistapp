/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {CopyOutlined, ShareAltOutlined} from '@ant-design/icons';
import {App, Button, Input, Modal, Space} from 'antd';
import type {Dispatch, SetStateAction} from 'react';

const SHARE_AVAILABLE: boolean = 'share' in navigator;

type Props = {
  title: string;
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  url?: string;
};

export const ShareModal: React.FC<Props> = ({title, open, setOpen, url}: Props) => {
  const {message} = App.useApp();

  const handleCopyToClipboardClick = () => {
    if ('clipboard' in navigator && url) {
      void navigator.clipboard.writeText(url);
      void message.info('Link copied to clipboard', 3);
    }
  };

  const handleShareViaClick = () => {
    if ('share' in navigator && url) {
      void navigator.share({
        title: 'ArtistAssistApp Color Set',
        url,
      });
    }
  };

  return (
    <Modal title={title} centered open={open} footer={null} onCancel={() => setOpen(false)}>
      {url ? (
        <>
          <p>Copy and share this link with your friends</p>
          <Space.Compact style={{width: '100%'}}>
            <Input value={url} />
            <Button icon={<CopyOutlined />} onClick={handleCopyToClipboardClick}>
              Copy
            </Button>
            {SHARE_AVAILABLE && (
              <Button type="primary" icon={<ShareAltOutlined />} onClick={handleShareViaClick}>
                Share via
              </Button>
            )}
          </Space.Compact>
        </>
      ) : (
        <p>Nothing to share</p>
      )}
    </Modal>
  );
};
