/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {App, Button, Input, Modal, Space} from 'antd';
import {Dispatch, SetStateAction} from 'react';
import {useCopyToClipboard} from 'usehooks-ts';

type Props = {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  url?: string;
};

export const SharePaintSetModal: React.FC<Props> = ({open, setOpen, url}: Props) => {
  const {message} = App.useApp();

  const [_, copy] = useCopyToClipboard();

  const copyToClipboard = () => {
    if (url) {
      copy(url);
      message.info('Link copied to clipboard');
    }
  };

  return (
    <Modal
      title="Share a paint set"
      centered
      open={open}
      footer={null}
      onCancel={() => setOpen(false)}
    >
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
        <p>No paint set to share</p>
      )}
    </Modal>
  );
};
