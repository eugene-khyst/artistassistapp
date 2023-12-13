/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {App, Col, Divider, Form, Input, Row, Typography} from 'antd';
import {ChangeEvent, Dispatch, SetStateAction, useCallback, useEffect, useState} from 'react';
import {ImageFile} from '../services/db';
import {deleteImageFile, getImageFiles, saveImageFile} from '../services/db/image-file-db';
import {SAMPLE_IMAGES, SampleImageUrl} from '../services/image/sample-images';
import {RecentImage} from './image/RecentImage';
import {SampleImage} from './image/SampleImage';
import {TabKey} from './types';

type Props = {
  setBlob: Dispatch<SetStateAction<Blob | undefined>>;
  setActiveTabKey: Dispatch<SetStateAction<TabKey>>;
  showZoomAndPanMessage: () => void;
};

export const SelectImage: React.FC<Props> = ({
  setBlob,
  setActiveTabKey,
  showZoomAndPanMessage,
}: Props) => {
  const {message} = App.useApp();

  const [recentFiles, setRecentFiles] = useState<ImageFile[]>([]);

  useEffect(() => {
    (async () => {
      setRecentFiles(await getImageFiles());
    })();
  }, []);

  const deleteRecentImage = useCallback(
    (imageFileId?: number) => {
      if (imageFileId) {
        setRecentFiles((prev: ImageFile[]) => prev.filter(({id}: ImageFile) => id !== imageFileId));
        deleteImageFile(imageFileId);
      }
    },
    [setRecentFiles]
  );

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
    setBlob(file);
    setActiveTabKey(TabKey.Colors);
    showZoomAndPanMessage();
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
          <Divider orientation="left">or select from recent photos</Divider>
          <Row gutter={[16, 16]} justify="start" style={{marginBottom: 16}}>
            {recentFiles.map((imageFile: ImageFile) => (
              <Col key={imageFile.id} xs={24} md={12} lg={8}>
                <RecentImage
                  {...{
                    imageFile,
                    deleteRecentImage,
                    setBlob,
                    setActiveTabKey,
                    showZoomAndPanMessage,
                  }}
                />
              </Col>
            ))}
          </Row>
        </>
      )}
      <Divider orientation="left">or select from sample photos</Divider>
      <Row gutter={[16, 16]} justify="start" style={{marginBottom: 16}}>
        {SAMPLE_IMAGES.map(([image, thumbnail, name]: SampleImageUrl) => (
          <Col key={name} xs={24} md={12} lg={8}>
            <SampleImage
              {...{
                image,
                thumbnail,
                name,
                setBlob,
                setActiveTabKey,
                showZoomAndPanMessage,
              }}
            />
          </Col>
        ))}
      </Row>
    </div>
  );
};
