/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {App, Button, Input, Modal, Space} from 'antd';
import type {Dispatch, SetStateAction} from 'react';
import {useCopyToClipboard} from 'usehooks-ts';

type Props = {
  title: string;
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  url?: string;
};

export const ShareModal: React.FC<Props> = ({title, open, setOpen, url}: Props) => {
  const {message} = App.useApp();

  const [, copy] = useCopyToClipboard();

  const copyToClipboard = () => {
    if (url) {
      void copy(url);
      void message.info('Link copied to clipboard', 3);
    }
  };

  return (
    <Modal title={title} centered open={open} footer={null} onCancel={() => setOpen(false)}>
      {url ? (
        <>
          <p>Copy and share this link with your friends</p>
          <Space.Compact style={{width: '100%'}}>
            <Input value={url} />
            <Button type="primary" onClick={copyToClipboard}>
              Copy
            </Button>
          </Space.Compact>
        </>
      ) : (
        <p>Nothing to share</p>
      )}
    </Modal>
  );
};
