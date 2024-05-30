/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Col, Form, Input, Row, Space, Spin, Typography} from 'antd';
import type {ChangeEvent} from 'react';
import {useState} from 'react';

import type {ImageFile} from '~/src/services/db';
import {useAppStore} from '~/src/stores/app-store';

import {RecentImageCard} from './image/RecentImageCard';
import {SampleImageCard} from './image/SampleImageCard';

type SampleImageUrl = [file: string, name: string];

const SAMPLE_IMAGES: SampleImageUrl[] = [
  [`chrysanthemum`, 'Chrysanthemum'],
  [`sunset`, 'Sunset'],
];

export const ImageSelect: React.FC = () => {
  const recentImageFiles = useAppStore(state => state.recentImageFiles);
  const saveRecentImageFile = useAppStore(state => state.saveRecentImageFile);
  const isRecentImageFilesLoading = useAppStore(state => state.isRecentImageFilesLoading);

  const [sampleImagesLoadingCount, setSampleImagesLoadingCount] = useState<number>(0);

  const isLoading: boolean = isRecentImageFilesLoading || sampleImagesLoadingCount > 0;

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file: File | undefined = e.target.files?.[0];
    if (file) {
      void saveRecentImageFile({file});
    }
  };

  return (
    <Spin spinning={isLoading} tip="Loading" size="large" delay={300}>
      <div style={{padding: '0 16px 16px'}}>
        <Space direction="vertical" size="middle" style={{width: '100%'}}>
          <Typography.Text strong>
            Select a reference photo from your device to paint from
          </Typography.Text>
          <Form.Item style={{marginBottom: 0}}>
            <Input type="file" size="large" onChange={handleFileChange} accept="image/*" />
          </Form.Item>
          {recentImageFiles.length > 0 && (
            <>
              <Typography.Text strong>Or select from recent photos</Typography.Text>
              <Row gutter={[16, 16]} align="middle" justify="start">
                {recentImageFiles.map((imageFile: ImageFile) => (
                  <Col key={imageFile.id} xs={24} md={12} lg={8} xl={6}>
                    <RecentImageCard imageFile={imageFile} />
                  </Col>
                ))}
              </Row>
            </>
          )}
          <Typography.Text strong>Or select from sample photos</Typography.Text>
          <Row gutter={[16, 16]} align="middle" justify="start">
            {SAMPLE_IMAGES.map(([file, name]: SampleImageUrl) => (
              <Col key={name} xs={24} md={12} lg={8} xl={6}>
                <SampleImageCard
                  image={`/sample-images/${file}.webp`}
                  thumbnail={`/sample-images/${file}-thumbnail.webp`}
                  name={name}
                  setLoadingCount={setSampleImagesLoadingCount}
                />
              </Col>
            ))}
          </Row>
        </Space>
      </div>
    </Spin>
  );
};
