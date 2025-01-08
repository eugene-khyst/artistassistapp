/**
 * ArtistAssistApp
 * Copyright (C) 2023-2024  Eugene Khyst
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import {LoadingOutlined} from '@ant-design/icons';
import {Col, Flex, Row, Spin, Typography} from 'antd';
import type {ChangeEvent} from 'react';
import {useState} from 'react';

import {AdCard} from '~/src/components/ad/AdCard';
import {FileSelect} from '~/src/components/image/FileSelect';
import type {ImageFile, SampleImageDefinition} from '~/src/services/image';
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
    <Spin spinning={isLoading} tip="Loading" indicator={<LoadingOutlined spin />} size="large">
      <Flex vertical gap="small" style={{padding: '0 16px 16px'}}>
        <Typography.Text strong>
          Select a reference photo from your device to paint from
        </Typography.Text>

        <div>
          <FileSelect onChange={e => void handleFileChange(e)}>Select photo</FileSelect>
        </div>

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
