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

import {Trans} from '@lingui/react/macro';
import {App, Col, Flex, Row, Typography} from 'antd';
import {useMemo} from 'react';

import {AdCard} from '@/components/ad/AdCard';
import {LoadingButton} from '@/components/button/LoadingButton';
import {FileSelect} from '@/components/file/FileSelect';
import {LoadingIndicator} from '@/components/loading/LoadingIndicator';
import {useErrorNotification} from '@/hooks/useErrorNotification';
import {useFileReadErrorNotification} from '@/hooks/useFileReadErrorNotification';
import {usePersistentStorage} from '@/hooks/usePersistentStorage';
import {useSampleImages} from '@/hooks/useSampleImages';
import {countImageFiles, getOldestImageFile} from '@/services/db/image-file-db';
import {fileToImageFile, type ImageFile} from '@/services/image/image-file';
import type {SampleImageDefinition} from '@/services/image/sample-images';
import {useAppStore} from '@/stores/app-store';
import {byNumber, reverseOrder} from '@/utils/comparator';

import {RecentImageCard} from './image/RecentImageCard';
import {SampleImageCard} from './image/SampleImageCard';

const MAX_IMAGE_FILES = 20;

export function ImageChooser() {
  const recentImageFiles = useAppStore(state => state.recentImageFiles);
  const hasMoreRecentImageFiles = useAppStore(state => state.hasMoreRecentImageFiles);
  const loadMoreRecentImageFiles = useAppStore(state => state.loadMoreRecentImageFiles);
  const saveRecentImageFile = useAppStore(state => state.saveRecentImageFile);
  const deleteRecentImageFile = useAppStore(state => state.deleteRecentImageFile);
  const isRecentImagesLoading = useAppStore(state => state.isRecentImagesLoading);
  const isSampleImageLoading = useAppStore(state => state.isSampleImageLoading);

  const {modal} = App.useApp();

  const showFileReadErrorNotification = useFileReadErrorNotification();

  const {
    sampleImages,
    isLoading: isSampleImagesLoading,
    isError: isSampleImagesError,
  } = useSampleImages();

  const sortedSampleImages: SampleImageDefinition[] | undefined = useMemo(
    () => sampleImages?.slice().sort(reverseOrder(byNumber(({priority}) => priority))),
    [sampleImages]
  );

  const {requestPersistentStorage, showStorageNotification, installDrawer} = usePersistentStorage();

  const isLoading: boolean = isRecentImagesLoading || isSampleImagesLoading || isSampleImageLoading;

  useErrorNotification(isSampleImagesError, <Trans>Error loading sample photos</Trans>);

  const handleFileChange = async ([file]: File[]) => {
    if (!file) {
      return;
    }
    let imageFile: ImageFile;
    try {
      imageFile = await fileToImageFile(file);
    } catch (error) {
      console.error(error);
      showFileReadErrorNotification();
      return;
    }
    const imageFileCount = await countImageFiles();
    if (imageFileCount >= MAX_IMAGE_FILES) {
      const confirmed: boolean = await modal.confirm({
        title: <Trans>Storage may fill up</Trans>,
        content: (
          <Trans>
            You already have many recent photos saved. Delete the oldest one to free up space? The
            new photo will still be added.
          </Trans>
        ),
        okText: <Trans>Delete oldest</Trans>,
        cancelText: <Trans>Keep all</Trans>,
        focusTriggerAfterClose: false,
      });
      if (confirmed) {
        const oldestImageFile = await getOldestImageFile();
        if (oldestImageFile) {
          await deleteRecentImageFile(oldestImageFile);
        }
      }
    }
    const granted = await requestPersistentStorage();
    void saveRecentImageFile(imageFile);
    showStorageNotification(granted);
  };

  return (
    <>
      <LoadingIndicator loading={isLoading}>
        <Flex vertical gap="small" className="u-tab-content">
          <Typography.Text strong>
            <Trans>Select a reference photo from your device to paint from</Trans>
          </Typography.Text>

          <div>
            <FileSelect showUseCopiedImage onChange={handleFileChange}>
              <Trans>Select photo</Trans>
            </FileSelect>
          </div>

          {recentImageFiles.length > 0 && (
            <Typography.Text strong>
              <Trans>Or select from your recent photos</Trans>
            </Typography.Text>
          )}

          <Row gutter={[16, 16]} align="top" justify="start" className="u-mb-em">
            {recentImageFiles.map((imageFile: ImageFile) => (
              <Col key={imageFile.digest} xs={24} sm={12} lg={6}>
                <RecentImageCard imageFile={imageFile} />
              </Col>
            ))}
            <Col xs={24} md={12} lg={6}>
              <AdCard vertical />
            </Col>
          </Row>

          {hasMoreRecentImageFiles && (
            <div>
              <LoadingButton run={loadMoreRecentImageFiles}>
                <Trans>Show older photos</Trans>
              </LoadingButton>
            </div>
          )}

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
}
