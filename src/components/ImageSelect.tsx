/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {App, Col, Form, Input, Row, Space, Spin, Typography} from 'antd';
import type {ChangeEvent} from 'react';
import {useState} from 'react';

import type {ImageFile} from '~/src/services/db';
import {useAppStore} from '~/src/stores/app-store';

import {RecentImage} from './image/RecentImage';
import {SampleImage} from './image/SampleImage';

type SampleImageUrl = [file: string, name: string];

const SAMPLE_IMAGES: SampleImageUrl[] = [
  [`chrysanthemum`, 'Chrysanthemum'],
  [`sunset`, 'Sunset'],
];

export const ImageSelect: React.FC = () => {
  const recentImageFiles = useAppStore(state => state.recentImageFiles);
  const saveRecentImageFile = useAppStore(state => state.saveRecentImageFile);
  const isRecentImageFilesLoading = useAppStore(state => state.isRecentImageFilesLoading);

  const {message} = App.useApp();

  const [imageLoadingCount, setImageLoadingCount] = useState<number>(0);

  const isLoading: boolean = isRecentImageFilesLoading || imageLoadingCount > 0;

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file: File | undefined = e.target.files?.[0];
    if (!file) {
      return;
    }
    const isImage = /image\/.*/.test(file.type);
    if (!isImage) {
      void message.error(`${file.name} is not an image file`);
      return;
    }
    void saveRecentImageFile({file});
  };

  return (
    <Spin spinning={isLoading} tip="Loading" size="large" delay={300}>
      <div style={{padding: '0 16px 16px'}}>
        <Space direction="vertical" size="small">
          <Typography.Text strong>
            Select a reference photo from your device to paint from.
          </Typography.Text>
          <Form.Item style={{marginBottom: 16}}>
            <Input type="file" size="large" onChange={handleFileChange} accept="image/*" />
          </Form.Item>
          {recentImageFiles.length > 0 && (
            <>
              <Typography.Text strong>Or select from recent photos.</Typography.Text>
              <Row gutter={[16, 16]} justify="start" style={{marginBottom: 16}}>
                {recentImageFiles.map((imageFile: ImageFile) => (
                  <Col key={imageFile.id} xs={24} md={12} lg={8}>
                    <RecentImage imageFile={imageFile} />
                  </Col>
                ))}
              </Row>
            </>
          )}
          <Typography.Text strong>Or select from sample photos.</Typography.Text>
          <Row gutter={[16, 16]} justify="start">
            {SAMPLE_IMAGES.map(([file, name]: SampleImageUrl) => (
              <Col key={name} xs={24} md={12} lg={8}>
                <SampleImage
                  image={`/sample-images/${file}.webp`}
                  thumbnail={`/sample-images/${file}-thumbnail.webp`}
                  name={name}
                  setImageLoadingCount={setImageLoadingCount}
                />
              </Col>
            ))}
          </Row>
        </Space>
      </div>
    </Spin>
  );
};
