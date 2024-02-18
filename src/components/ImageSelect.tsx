/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {App, Col, Divider, Form, Input, Row, Spin, Typography, theme} from 'antd';
import {ChangeEvent, Dispatch, SetStateAction, useCallback, useEffect, useState} from 'react';
import {ImageFile} from '../services/db';
import {deleteImageFile, getImageFiles, saveImageFile} from '../services/db/image-file-db';
import {SAMPLE_IMAGES, SampleImageUrl} from '../services/image/sample-images';
import {RecentImage} from './image/RecentImage';
import {SampleImage} from './image/SampleImage';

const MAX_RECENT_IMAGES = 9;

type Props = {
  setBlob: Dispatch<SetStateAction<Blob | undefined>>;
  imageFileId?: number;
  setImageFileId: Dispatch<SetStateAction<number | undefined>>;
};

export const ImageSelect: React.FC<Props> = ({
  setBlob,
  imageFileId: currentImageFileId,
  setImageFileId,
}: Props) => {
  const {
    token: {fontSizeLG},
  } = theme.useToken();

  const {message} = App.useApp();

  const [recentFiles, setRecentFiles] = useState<ImageFile[]>([]);
  const [imageLoadingCount, setImageLoadingCount] = useState<number>(0);

  const isLoading: boolean = imageLoadingCount > 0;

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
        if (currentImageFileId === imageFileId) {
          setImageFileId(undefined);
          setBlob(undefined);
        }
      }
    },
    [setRecentFiles, currentImageFileId, setImageFileId, setBlob]
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
    const imageFileId: number = await saveImageFile(file, MAX_RECENT_IMAGES);
    setImageFileId(imageFileId);
    setRecentFiles(await getImageFiles());
  };

  return (
    <Spin spinning={isLoading} tip="Loading" size="large" delay={300}>
      <div style={{padding: '0 16px 8px'}}>
        <Form.Item
          label={
            <Typography.Text style={{fontSize: fontSizeLG}}>
              Select a reference photo from your device to paint from
            </Typography.Text>
          }
          colon={false}
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
                    imageFile={imageFile}
                    deleteRecentImage={deleteRecentImage}
                    setBlob={setBlob}
                    setImageFileId={setImageFileId}
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
                image={image}
                thumbnail={thumbnail}
                name={name}
                setBlob={setBlob}
                setImageFileId={setImageFileId}
                setImageLoadingCount={setImageLoadingCount}
              />
            </Col>
          ))}
        </Row>
      </div>
    </Spin>
  );
};
