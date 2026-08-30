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
import {
  Card,
  Col,
  Flex,
  Radio,
  type RadioChangeEvent,
  Row,
  Select,
  Space,
  Tag,
  Typography,
} from 'antd';
import {saveAs} from 'file-saver';
import {type ReactNode, useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {EmptyImage} from '@/components/empty/EmptyImage';
import {FileSelect} from '@/components/file/FileSelect';
import {ImageSaveButton} from '@/components/image/ImageSaveButton';
import {LoadingIndicator} from '@/components/loading/LoadingIndicator';
import {filterSelectOptions} from '@/components/utils';
import {DATA_URL} from '@/config';
import {useAccessTo} from '@/hooks/useAccessTo';
import {useCreateObjectUrl} from '@/hooks/useCreateObjectUrl';
import {useErrorNotification} from '@/hooks/useErrorNotification';
import {useFileReadErrorNotification} from '@/hooks/useFileReadErrorNotification';
import {useOnnxModel} from '@/hooks/useOnnxModel';
import {useSelectedCatalogItem} from '@/hooks/useSelectedCatalogItem';
import {useStyleImages} from '@/hooks/useStyleImages';
import {Access} from '@/services/auth/types';
import {hasAccessTo} from '@/services/auth/utils';
import {fileToImageFile} from '@/services/image/image-file';
import {CUSTOM_STYLE_IMAGE_ID, type StyleImageDefinition} from '@/services/image/style-images';
import {OnnxModelType} from '@/services/ml/types';
import {useAppStore} from '@/stores/app-store';
import {getFilename} from '@/utils/filename';
import {splitUrl} from '@/utils/url';

import styles from './ImageStyleTransfer.module.css';

const TAGS: Record<string, ReactNode> = {
  portrait: <Trans>Portrait</Trans>,
  landscape: <Trans>Landscape</Trans>,
  cityscape: <Trans>Cityscape</Trans>,
  seascape: <Trans>Seascape</Trans>,
  'still-life': <Trans>Still Life</Trans>,
  'northern-renaissance': <Trans>Northern Renaissance</Trans>,
  'dutch-baroque': <Trans>Dutch Baroque</Trans>,
  realism: <Trans>Realism</Trans>,
  'barbizon-school': <Trans>Barbizon School</Trans>,
  impressionism: <Trans>Impressionism</Trans>,
  'post-impressionism': <Trans>Post-Impressionism</Trans>,
  'neo-impressionism': <Trans>Neo-Impressionism</Trans>,
  pointillism: <Trans>Pointillism</Trans>,
  divisionism: <Trans>Divisionism</Trans>,
  expressionism: <Trans>Expressionism</Trans>,
  'vienna-secession': <Trans>Vienna Secession</Trans>,
  fauvism: <Trans>Fauvism</Trans>,
  cubism: <Trans>Cubism</Trans>,
  watercolor: <Trans>Watercolor</Trans>,
  pastel: <Trans>Pastel</Trans>,
  engraving: <Trans>Engraving</Trans>,
  etching: <Trans>Etching</Trans>,
  mosaic: <Trans>Mosaic</Trans>,
  'ukiyo-e': <Trans>Ukiyo-e</Trans>,
};

const showSearch = {filterOption: filterSelectOptions};

export function ImageStyleTransfer() {
  const user = useAppStore(state => state.auth?.user);
  const originalImageFile = useAppStore(state => state.selectedImageFile);
  const customStyleTransferImageDigest = useAppStore(
    state => state.appSettings.styleTransferImageDigest
  );
  const customStyleImage = useAppStore(state => state.customStyleImage);
  const isStyleTransferLoading = useAppStore(state => state.isStyleTransferLoading);
  const styleTransferDownloadTip = useAppStore(state => state.styleTransferDownloadTip);
  const styleTransferResultBlob = useAppStore(state => state.styleTransferResultBlob);

  const setStyleTransferModel = useAppStore(state => state.setStyleTransferModel);
  const setStyleTransferImage = useAppStore(state => state.setStyleTransferImage);
  const saveCustomStyleImage = useAppStore(state => state.saveCustomStyleImage);
  const loadCustomStyleImage = useAppStore(state => state.loadCustomStyleImage);
  const abortStyleTransfer = useAppStore(state => state.abortStyleTransfer);

  const {t} = useLingui();

  const showFileReadErrorNotification = useFileReadErrorNotification();

  const {
    model,
    isLoading: isModelLoading,
    isError: isModelError,
  } = useOnnxModel(OnnxModelType.StyleTransfer, 'cast');

  const access = useAccessTo(model);

  const {
    styleImages,
    isLoading: isStyleImagesLoading,
    isError: isStyleImagesError,
  } = useStyleImages();

  useErrorNotification(
    isModelError || isStyleImagesError,
    <Trans>Unable to load the styles</Trans>,
    <Trans>Check your connection and try again.</Trans>
  );

  const defaultPredicate = useCallback(
    ({id}: StyleImageDefinition) =>
      id !== CUSTOM_STYLE_IMAGE_ID || !!customStyleTransferImageDigest,
    [customStyleTransferImageDigest]
  );

  const {
    sortedItems: sortedStyleImages,
    defaultItem: defaultStyleImage,
    itemId: styleImageId,
    selectedItemId: selectedStyleImageId,
    selectItem: selectStyleImage,
    setSelectedItemId: setSelectedStyleImageId,
  } = useSelectedCatalogItem({
    items: styleImages,
    settingsKey: 'styleTransferImageId',
    setItem: setStyleTransferImage,
    defaultPredicate,
  });

  useEffect(() => {
    setStyleTransferModel(model);
  }, [model, setStyleTransferModel]);

  useEffect(() => {
    if (customStyleTransferImageDigest) {
      void loadCustomStyleImage();
    }
  }, [loadCustomStyleImage, customStyleTransferImageDigest]);

  const radioGroupRef = useRef<HTMLDivElement>(null);
  const hasScrolledToDefaultRef = useRef(false);

  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const isLoading: boolean = isModelLoading || isStyleImagesLoading || isStyleTransferLoading;
  const isCancelable: boolean = isStyleTransferLoading;

  const originalImageUrl: string | undefined = useCreateObjectUrl(originalImageFile?.blob);
  const customStyleImageUrl: string | undefined = useCreateObjectUrl(customStyleImage?.blob);
  const styleTransferResultUrl: string | undefined = useCreateObjectUrl(styleTransferResultBlob);

  useEffect(() => {
    if (
      hasScrolledToDefaultRef.current ||
      selectedStyleImageId !== undefined ||
      !defaultStyleImage?.id
    ) {
      return;
    }
    hasScrolledToDefaultRef.current = true;
    radioGroupRef.current
      ?.querySelector(`input[value="${defaultStyleImage.id}"]`)
      ?.closest('.ant-radio-wrapper')
      ?.scrollIntoView({behavior: 'smooth', block: 'start'});
  }, [selectedStyleImageId, defaultStyleImage?.id]);

  const handleStyleImageChange = (e: RadioChangeEvent) => {
    selectStyleImage(e.target.value as string);
  };

  const handleSaveClick = () => {
    if (styleTransferResultUrl) {
      saveAs(styleTransferResultUrl, getFilename(originalImageFile, 'styled'));
    }
  };

  const handleCancelClick = () => {
    abortStyleTransfer();
    setSelectedStyleImageId(null);
  };

  const artistOptions = useMemo(
    () =>
      [...new Set(sortedStyleImages.flatMap(({artist}) => artist || []))]
        .sort()
        .map(artist => ({value: artist, label: artist})),
    [sortedStyleImages]
  );

  const tagOptions = useMemo(
    () =>
      [...new Set(sortedStyleImages.flatMap(({tags}) => tags ?? []))]
        .sort()
        .map(tag => ({value: tag, label: TAGS[tag] ?? tag})),
    [sortedStyleImages]
  );

  const filteredStyleImages = useMemo(
    () =>
      sortedStyleImages.filter(
        ({id, artist, tags}) =>
          id === CUSTOM_STYLE_IMAGE_ID ||
          ((!selectedArtists.length || (!!artist && selectedArtists.includes(artist))) &&
            (!selectedTags.length || !!tags?.some(tag => selectedTags.includes(tag))))
      ),
    [sortedStyleImages, selectedArtists, selectedTags]
  );

  const radioOptions = useMemo(
    () =>
      (access === Access.Allowed ? filteredStyleImages : []).map(styleImage => {
        const hasAccess = hasAccessTo(user, styleImage);
        const {id, image, artist, title, tags} = styleImage;
        const isCustomStyleTransferImage = id === CUSTOM_STYLE_IMAGE_ID;
        let thumbnail: string | undefined;
        if (isCustomStyleTransferImage) {
          thumbnail = customStyleImageUrl;
        } else {
          const [baseUrl, filename] = splitUrl(new URL(image, DATA_URL));
          thumbnail = `${baseUrl}thumbnails/${filename}`;
        }
        return {
          value: id,
          label: (
            <Card
              key={id}
              hoverable
              cover={
                thumbnail && (
                  <img
                    src={thumbnail}
                    alt={isCustomStyleTransferImage ? t`Your style image` : `${artist}, ${title}`}
                    crossOrigin="anonymous"
                    loading="lazy"
                    className={styles['coverImage']}
                  />
                )
              }
              actions={
                isCustomStyleTransferImage
                  ? [
                      <div key={id} className="u-px">
                        <FileSelect
                          showUseCopiedImage
                          onChange={async ([file]: File[]) => {
                            if (!file) {
                              return;
                            }
                            try {
                              await saveCustomStyleImage(await fileToImageFile(file));
                            } catch (error) {
                              console.error(error);
                              showFileReadErrorNotification();
                              return;
                            }
                            selectStyleImage(CUSTOM_STYLE_IMAGE_ID);
                          }}
                          onClear={() => {
                            void saveCustomStyleImage(null);
                          }}
                          disabled={!hasAccess}
                        >
                          <Trans>Select style image</Trans>
                        </FileSelect>
                      </div>,
                    ]
                  : undefined
              }
            >
              <Card.Meta
                title={isCustomStyleTransferImage ? <Trans>Your image</Trans> : artist}
                description={
                  <Flex vertical gap="small">
                    <Typography.Text>
                      {isCustomStyleTransferImage ? (
                        <Trans>Transfer the artistic style from your own image</Trans>
                      ) : (
                        title
                      )}
                    </Typography.Text>
                    {!hasAccess && (
                      <Typography.Text type="warning">
                        {isCustomStyleTransferImage ? (
                          <Trans>
                            Transferring the style from your own image is available to paid Patreon
                            members only
                          </Trans>
                        ) : (
                          <Trans>This style is available only to paid Patreon members</Trans>
                        )}
                      </Typography.Text>
                    )}
                    {!!tags?.length && (
                      <Flex gap="small" align="center" wrap>
                        {tags.map(tag => (
                          <Tag key={tag}>{TAGS[tag] ?? tag}</Tag>
                        ))}
                      </Flex>
                    )}
                  </Flex>
                }
              />
            </Card>
          ),
          disabled: !hasAccess,
        };
      }),
    [
      access,
      filteredStyleImages,
      user,
      customStyleImageUrl,
      saveCustomStyleImage,
      selectStyleImage,
      showFileReadErrorNotification,
      t,
    ]
  );

  if (!originalImageFile) {
    return <EmptyImage />;
  }

  return (
    <LoadingIndicator
      loading={isLoading}
      tip={styleTransferDownloadTip}
      onCancel={isCancelable && handleCancelClick}
    >
      <Row>
        <Col xs={24} sm={12} lg={16} className={styles['imageColumn']}>
          <img
            src={styleTransferResultUrl ?? originalImageUrl}
            alt={styleTransferResultUrl ? t`Styled reference photo` : t`Reference photo`}
            className={styles['previewImage']}
          />
        </Col>
        <Col xs={24} sm={12} lg={8} className={styles['sidePanel']}>
          <Space vertical className={styles['header']}>
            <Typography.Text strong>
              <Trans>Select a style to transfer to your reference photo</Trans>
            </Typography.Text>

            <Flex gap="small" className="u-w-100">
              <ImageSaveButton onSave={handleSaveClick} disabled={!styleTransferResultUrl} />

              <Select
                mode="multiple"
                options={artistOptions}
                value={selectedArtists}
                onChange={setSelectedArtists}
                placeholder={t`Filter by artist`}
                showSearch={showSearch}
                allowClear
                maxTagCount="responsive"
                popupMatchSelectWidth={false}
                className={styles['filterSelect']}
              />

              <Select
                mode="multiple"
                options={tagOptions}
                value={selectedTags}
                onChange={setSelectedTags}
                placeholder={t`Filter by tag`}
                allowClear
                maxTagCount="responsive"
                popupMatchSelectWidth={false}
                className={styles['filterSelect']}
              />
            </Flex>

            {access === Access.Denied && (
              <Typography.Text type="warning">
                <Trans>Style transfer is available only to paid Patreon members</Trans>
              </Typography.Text>
            )}
          </Space>

          <div className={styles['optionsScroll']}>
            <Radio.Group
              ref={radioGroupRef}
              value={styleImageId}
              onChange={handleStyleImageChange}
              options={radioOptions}
              className={styles['radioGroup']}
            />
          </div>
        </Col>
      </Row>
    </LoadingIndicator>
  );
}
