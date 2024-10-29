/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Col, Flex, Form, Input, Row, Spin, Typography} from 'antd';
import type {ChangeEvent} from 'react';
import {useState} from 'react';

import {AdCard} from '~/src/components/ad/AdCard';
import type {ImageFile} from '~/src/services/image';
import type {SampleImageDefinition} from '~/src/services/image';
import {fileToImageFile, SAMPLE_IMAGES} from '~/src/services/image';
import {useAppStore} from '~/src/stores/app-store';

import {RecentImageCard} from './image/RecentImageCard';
import {SampleImageCard} from './image/SampleImageCard';

export const ImageChooser: React.FC = () => {
  const recentImageFiles = useAppStore(state => state.recentImageFiles);
  const saveRecentImageFile = useAppStore(state => state.saveRecentImageFile);
  const isInitialStateLoading = useAppStore(state => state.isInitialStateLoading);

  const [sampleImagesLoadingCount, setSampleImagesLoadingCount] = useState<number>(0);

  const isLoading: boolean = isInitialStateLoading || sampleImagesLoadingCount > 0;

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file: File | undefined = e.target.files?.[0];
    if (file) {
      void saveRecentImageFile(await fileToImageFile(file));
    }
  };

  return (
    <Spin spinning={isLoading} tip="Loading" size="large" delay={300}>
      <Flex vertical gap="middle" style={{padding: '0 16px 16px'}}>
        <Typography.Text strong>
          Select a reference photo from your device to paint from
        </Typography.Text>

        <Form.Item style={{marginBottom: 0}}>
          <Input
            type="file"
            size="large"
            onChange={e => void handleFileChange(e)}
            accept="image/*"
          />
        </Form.Item>

        <Typography.Text strong>Or select from your recent photos</Typography.Text>

        <Row gutter={[16, 16]} align="top" justify="start" style={{marginBottom: '1em'}}>
          {recentImageFiles.map((imageFile: ImageFile) => (
            <Col key={imageFile.id} xs={24} md={12} lg={6}>
              <RecentImageCard imageFile={imageFile} />
            </Col>
          ))}
          <Col xs={24} md={12} lg={6}>
            <AdCard vertical />
          </Col>
        </Row>

        <Typography.Text strong>Or select from sample photos</Typography.Text>

        <Row gutter={[16, 16]} align="top" justify="start">
          {SAMPLE_IMAGES.map(({image, thumbnail, name}: SampleImageDefinition) => (
            <Col key={name} xs={24} md={12} lg={6}>
              <SampleImageCard
                image={image}
                thumbnail={thumbnail}
                name={name}
                setLoadingCount={setSampleImagesLoadingCount}
              />
            </Col>
          ))}
        </Row>
      </Flex>
    </Spin>
  );
};
