/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {App, Button, Divider, Form, Image, Input, Space, Typography} from 'antd';
import {ChangeEvent, Dispatch, SetStateAction, useEffect, useState} from 'react';
import {getImageFile, saveImageFile} from '../services/db/image-file-db';
import {TabKey} from './types';

type Props = {
  setFile: Dispatch<SetStateAction<File | undefined>>;
  setActiveTabKey: Dispatch<SetStateAction<TabKey>>;
};

export const SelectImage: React.FC<Props> = ({setFile, setActiveTabKey}: Props) => {
  const {message} = App.useApp();

  const [prevFile, setPrevFile] = useState<File | undefined>();
  const [prevFileUrl, setPrevFileUrl] = useState<string | undefined>();

  useEffect(() => {
    (async () => {
      const fileFromDb: File | undefined = await getImageFile();
      if (fileFromDb) {
        setPrevFile(fileFromDb);
      }
    })();
  }, [setFile]);

  useEffect(() => {
    if (!prevFile) {
      return;
    }
    setPrevFileUrl((url?: string) => {
      if (url) {
        URL.revokeObjectURL(url);
      }
      return URL.createObjectURL(prevFile);
    });
  }, [prevFile]);

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
    setPrevFile(file);
    saveImageFile(file);
    setActiveTabKey(TabKey.Colors);
  };

  const handlePrevImageButtonClick = () => {
    setFile(prevFile);
    setActiveTabKey(TabKey.Colors);
  };

  return (
    <div style={{padding: '0 16px 8px'}}>
      <Typography.Title level={3} style={{marginTop: '0.5em'}}>
        Select photo
      </Typography.Title>
      <Form.Item
        label="Select a new photo"
        labelCol={{xs: 24}}
        labelAlign="left"
        style={{marginBottom: 0}}
      >
        <Input type="file" size="large" onChange={handleFileChange} accept="image/*" />
      </Form.Item>
      {prevFile && (
        <>
          <Divider orientation="left">or</Divider>
          <Space direction="vertical" size="small">
            <Button onClick={handlePrevImageButtonClick}>Select this photo</Button>
            {prevFileUrl && <Image width={300} src={prevFileUrl} alt={prevFile.name} />}
            {<b>{prevFile.name}</b>}
          </Space>
        </>
      )}
    </div>
  );
};
