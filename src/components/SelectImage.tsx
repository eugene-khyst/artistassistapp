/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {App, Input, Typography} from 'antd';
import {ChangeEvent, Dispatch, SetStateAction} from 'react';
import {TabKey} from './types';

type Props = {
  setFile: Dispatch<SetStateAction<File | undefined>>;
  setActiveTabKey: Dispatch<SetStateAction<TabKey>>;
};

export const SelectImage: React.FC<Props> = ({setFile, setActiveTabKey}: Props) => {
  const {message} = App.useApp();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file: File | undefined = e.target.files?.[0];
    if (!file) {
      return;
    }
    const isImage = /image\/.*/.test(file.type);
    if (!isImage) {
      message.error(`${file.name} is not an image file`);
      return;
    }
    setFile(file);
    setActiveTabKey(TabKey.Colors);
  };

  return (
    <div style={{padding: '0 16px 8px'}}>
      <Typography.Title level={3} style={{marginTop: '0.5em'}}>
        Select photo
      </Typography.Title>
      <Input type="file" size="large" onChange={handleFileChange} accept="image/*" />
    </div>
  );
};
