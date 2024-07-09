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
      void message.info('Link copied to clipboard');
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
        if (error instanceof DOMException && error.name === 'AbortError') {
          // Share canceled
        }
      }
    }
  };

  return (
    <Modal title={title} centered open={open} footer={null} onCancel={() => setOpen(false)}>
      {url ? (
        <>
          <p>Copy and share this link</p>
          <Space.Compact style={{width: '100%'}}>
            <Input value={url} />
            {SHARE_AVAILABLE ? (
              <Button
                type="primary"
                icon={<ShareAltOutlined />}
                onClick={() => void handleShareClick()}
              >
                Share
              </Button>
            ) : (
              <Button icon={<CopyOutlined />} onClick={handleCopyToClipboardClick}>
                Copy
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
