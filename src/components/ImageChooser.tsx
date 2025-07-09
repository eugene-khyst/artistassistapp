/**
 * ArtistAssistApp
 * Copyright (C) 2023-2025  Eugene Khyst
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
import {Trans, useLingui} from '@lingui/react/macro';
import {App, Col, Flex, Row, Spin, Typography} from 'antd';
import {useState} from 'react';

import {AdCard} from '~/src/components/ad/AdCard';
import {FileSelect} from '~/src/components/file/FileSelect';
import {PERSISTENT_STORAGE_WARN} from '~/src/components/messages';
import type {ImageFile} from '~/src/services/image/image-file';
import {fileToImageFile} from '~/src/services/image/image-file';
import type {SampleImageDefinition} from '~/src/services/image/sample-images';
import {SAMPLE_IMAGES} from '~/src/services/image/sample-images';
import {useAppStore} from '~/src/stores/app-store';
import {requestPersistentStorage} from '~/src/utils/storage';

import {RecentImageCard} from './image/RecentImageCard';
import {SampleImageCard} from './image/SampleImageCard';

export const ImageChooser: React.FC = () => {
  const recentImageFiles = useAppStore(state => state.recentImageFiles);
  const saveRecentImageFile = useAppStore(state => state.saveRecentImageFile);

  const [sampleImagesLoadingCount, setSampleImagesLoadingCount] = useState<number>(0);

  const {modal} = App.useApp();

  const {t} = useLingui();

  const isLoading: boolean = sampleImagesLoadingCount > 0;

  const handleFileChange = async ([file]: File[]) => {
    if (!(await requestPersistentStorage())) {
      const {title, content} = PERSISTENT_STORAGE_WARN;
      await modal.warning({
        title: t(title),
        content: t(content),
      });
    }
    if (file) {
      void saveRecentImageFile(await fileToImageFile(file));
    }
  };

  return (
    <Spin spinning={isLoading} indicator={<LoadingOutlined spin />} size="large">
      <Flex vertical gap="small" style={{padding: '0 16px 16px'}}>
        <Typography.Text strong>
          <Trans>Select a reference photo from your device to paint from</Trans>
        </Typography.Text>

        <div>
          <FileSelect
            onChange={(files: File[]) => {
              void handleFileChange(files);
            }}
          >
            <Trans>Select photo</Trans>
          </FileSelect>
        </div>

        {recentImageFiles.length > 0 && (
          <Typography.Text strong>
            <Trans>Or select from your recent photos</Trans>
          </Typography.Text>
        )}

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

        <Typography.Text strong>
          <Trans>Or select from sample photos</Trans>
        </Typography.Text>

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
