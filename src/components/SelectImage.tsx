/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {App, Col, Divider, Form, Input, Row, Typography} from 'antd';
import {ChangeEvent, Dispatch, SetStateAction, useEffect, useState} from 'react';
import {ImageFile} from '../services/db/db';
import {getImageFiles, saveImageFile} from '../services/db/image-file-db';
import {RecentImage} from './RecentImage';
import {TabKey} from './types';

type Props = {
  setFile: Dispatch<SetStateAction<File | undefined>>;
  setActiveTabKey: Dispatch<SetStateAction<TabKey>>;
};

export const SelectImage: React.FC<Props> = ({setFile, setActiveTabKey}: Props) => {
  const {message} = App.useApp();

  const [recentFiles, setRecentFiles] = useState<ImageFile[]>([]);

  useEffect(() => {
    (async () => {
      setRecentFiles(await getImageFiles());
    })();
  }, []);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
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
    await saveImageFile(file);
    setRecentFiles(await getImageFiles());
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
      {!!recentFiles.length && (
        <>
          <Divider orientation="left">or select a recent photo</Divider>
          <Row gutter={[16, 16]} justify="start" style={{marginBottom: 16}}>
            {recentFiles.map((imageFile: ImageFile) => (
              <Col key={imageFile.id} xs={24} md={12} lg={8}>
                <RecentImage {...{imageFile, setFile, setActiveTabKey}} />
              </Col>
            ))}
          </Row>
        </>
      )}
    </div>
  );
};
