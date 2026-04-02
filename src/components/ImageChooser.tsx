/**
 * ArtistAssistApp
 * Copyright (C) 2023-2026  Eugene Khyst
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

import {Trans, useLingui} from '@lingui/react/macro';
import {App, Col, Flex, Row, Typography} from 'antd';
import {useEffect, useMemo} from 'react';

import {AdCard} from '~/src/components/ad/AdCard';
import {FileSelect} from '~/src/components/file/FileSelect';
import {LoadingIndicator} from '~/src/components/loading/LoadingIndicator';
import {usePersistentStorage} from '~/src/hooks/usePersistentStorage';
import {useSampleImages} from '~/src/hooks/useSampleImages';
import type {ImageFile} from '~/src/services/image/image-file';
import {fileToImageFile} from '~/src/services/image/image-file';
import type {SampleImageDefinition} from '~/src/services/image/sample-images';
import {useAppStore} from '~/src/stores/app-store';
import {byNumber, reverseOrder} from '~/src/utils/comparator';

import {RecentImageCard} from './image/RecentImageCard';
import {SampleImageCard} from './image/SampleImageCard';

export const ImageChooser: React.FC = () => {
  const recentImageFiles = useAppStore(state => state.recentImageFiles);
  const saveRecentImageFile = useAppStore(state => state.saveRecentImageFile);
  const isSampleImageLoading = useAppStore(state => state.isSampleImageLoading);

  const {notification} = App.useApp();

  const {t} = useLingui();

  const {
    sampleImages,
    isLoading: isSampleImagesLoading,
    isError: isSampleImagesError,
  } = useSampleImages();

  const sortedSampleImages: SampleImageDefinition[] | undefined = useMemo(
    () => sampleImages?.slice().sort(reverseOrder(byNumber(({priority}) => priority))),
    [sampleImages]
  );

  const {checkPersistentStorage, installDrawer} = usePersistentStorage();

  const isLoading: boolean = isSampleImagesLoading || isSampleImageLoading;

  useEffect(() => {
    if (isSampleImagesError) {
      notification.error({
        title: t`Error loading sample photos`,
        placement: 'top',
        duration: 10,
        showProgress: true,
      });
    }
  }, [isSampleImagesError, notification, t]);

  const handleFileChange = async ([file]: File[]) => {
    await checkPersistentStorage();
    if (file) {
      void saveRecentImageFile(await fileToImageFile(file));
    }
  };

  return (
    <>
      <LoadingIndicator loading={isLoading}>
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
              <Col key={imageFile.id} xs={24} sm={12} lg={6}>
                <RecentImageCard imageFile={imageFile} />
              </Col>
            ))}
            <Col xs={24} md={12} lg={6}>
              <AdCard vertical />
            </Col>
          </Row>

          {!!sortedSampleImages?.length && (
            <>
              <Typography.Text strong>
                <Trans>Or select from sample photos</Trans>
              </Typography.Text>

              <Row gutter={[16, 16]} align="top" justify="start">
                {sortedSampleImages.map(sampleImage => (
                  <Col key={sampleImage.name} xs={24} sm={12} lg={6}>
                    <SampleImageCard sampleImage={sampleImage} />
                  </Col>
                ))}
              </Row>
            </>
          )}
        </Flex>
      </LoadingIndicator>
      {installDrawer}
    </>
  );
};
