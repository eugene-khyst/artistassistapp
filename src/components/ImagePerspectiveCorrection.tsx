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

import {
  AimOutlined,
  BarChartOutlined,
  CheckOutlined,
  CloseOutlined,
  DownloadOutlined,
  DownOutlined,
  MoreOutlined,
  QuestionCircleOutlined,
  RotateRightOutlined,
} from '@ant-design/icons';
import {Trans, useLingui} from '@lingui/react/macro';
import {App, Button, Dropdown, Flex, Grid, Space, Tooltip, Typography} from 'antd';
import type {MenuProps} from 'antd/lib';
import {saveAs} from 'file-saver';
import {useEffect} from 'react';

import {FileSelect} from '~/src/components/file/FileSelect';
import {LoadingIndicator} from '~/src/components/loading/LoadingIndicator';
import {useOnnxModel} from '~/src/hooks/useOnnxModel';
import {useZoomableImageCanvas} from '~/src/hooks/useZoomableImageCanvas';
import {ImageCroppingCanvas} from '~/src/services/canvas/image/image-cropping-canvas';
import {ImagePerspectiveCorrectionCanvas} from '~/src/services/canvas/image/image-perspective-correction-canvas';
import type {Vector} from '~/src/services/math/geometry';
import {OnnxModelType} from '~/src/services/ml/types';
import {useAppStore} from '~/src/stores/app-store';
import {TabKey} from '~/src/tabs';
import {getFilename} from '~/src/utils/filename';
import {DrawImage, imageBitmapToBlob} from '~/src/utils/graphics';
import {isAbortError} from '~/src/utils/promise';

import styles from './ImagePerspectiveCorrection.module.css';

const FILENAME_SUFFIX = 'perspective-corrected';

const imagePerspectiveCorrectionCanvasSupplier = (
  canvas: HTMLCanvasElement
): ImagePerspectiveCorrectionCanvas => {
  return new ImagePerspectiveCorrectionCanvas(canvas, {lineWidth: 3});
};

const imageCroppingCanvasSupplier = (canvas: HTMLCanvasElement): ImageCroppingCanvas => {
  return new ImageCroppingCanvas(canvas);
};

export function ImagePerspectiveCorrection() {
  const imageFileToCorrectPerspective = useAppStore(state => state.imageFileToCorrectPerspective);
  const perspectiveUncorrectedImage = useAppStore(state => state.perspectiveUncorrectedImage);
  const perspectiveCorrectedImage = useAppStore(state => state.perspectiveCorrectedImage);
  const isPerspectiveCorrectedImageLoading = useAppStore(
    state => state.isPerspectiveCorrectedImageLoading
  );
  const isPerspectiveAutoDetectLoading = useAppStore(state => state.isPerspectiveAutoDetectLoading);
  const perspectiveAutoDetectDownloadTip = useAppStore(
    state => state.perspectiveAutoDetectDownloadTip
  );

  const setActiveTabKey = useAppStore(state => state.setActiveTabKey);
  const setImageFileToCorrectPerspective = useAppStore(
    state => state.setImageFileToCorrectPerspective
  );
  const rotatePerspectiveUncorrectedImage = useAppStore(
    state => state.rotatePerspectiveUncorrectedImage
  );
  const setPerspectiveCorrectionModel = useAppStore(state => state.setPerspectiveCorrectionModel);
  const autoDetectPerspectiveVertices = useAppStore(state => state.autoDetectPerspectiveVertices);
  const abortPerspectiveAutoDetect = useAppStore(state => state.abortPerspectiveAutoDetect);
  const correctImagePerspective = useAppStore(state => state.correctImagePerspective);
  const resetPerspectiveCorrection = useAppStore(state => state.resetPerspectiveCorrection);
  const setImageFileToAdjustColors = useAppStore(state => state.setImageFileToAdjustColors);

  const screens = Grid.useBreakpoint();

  const {notification} = App.useApp();

  const {t} = useLingui();

  const {
    model,
    isLoading: isModelLoading,
    isError: isModelError,
  } = useOnnxModel(OnnxModelType.PerspectiveCorrection, 'docaligner-fastvit-t8');

  const {ref: canvas1Ref, zoomableImageCanvas: imagePerspectiveCorrectionCanvas} =
    useZoomableImageCanvas<ImagePerspectiveCorrectionCanvas>(
      imagePerspectiveCorrectionCanvasSupplier,
      perspectiveUncorrectedImage
    );

  const {ref: canvas2Ref, zoomableImageCanvas: imageCroppingCanvas} =
    useZoomableImageCanvas<ImageCroppingCanvas>(
      imageCroppingCanvasSupplier,
      perspectiveCorrectedImage
    );

  const isLoading: boolean =
    isModelLoading || isPerspectiveAutoDetectLoading || isPerspectiveCorrectedImageLoading;

  useEffect(() => {
    if (isModelError) {
      notification.error({
        title: t`Error while fetching ML model data`,
        placement: 'top',
        duration: 10,
        showProgress: true,
      });
    }
  }, [isModelError, notification, t]);

  useEffect(() => {
    setPerspectiveCorrectionModel(model);
  }, [setPerspectiveCorrectionModel, model]);

  const handleFileChange = ([file]: File[]) => {
    void setImageFileToCorrectPerspective(file ?? null);
  };

  const handleApplyClick = () => {
    if (
      !imagePerspectiveCorrectionCanvas ||
      imagePerspectiveCorrectionCanvas.getVertices().length < 4
    ) {
      notification.error({
        title: t`Select 4 points to correct perspective distortion`,
        placement: 'top',
        duration: 10,
        showProgress: true,
      });
      return;
    }
    correctImagePerspective(imagePerspectiveCorrectionCanvas.getVertices());
  };

  const handleAutoDetectClick = async () => {
    if (!imagePerspectiveCorrectionCanvas) {
      return;
    }
    let vertices: Vector[] | null;
    try {
      vertices = await autoDetectPerspectiveVertices();
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }
      throw error;
    }
    if (!vertices) {
      notification.error({
        title: t`Could not detect the paper or canvas automatically`,
        description: t`Adjust the 4 points manually.`,
        placement: 'top',
        duration: 10,
        showProgress: true,
      });
      return;
    }
    imagePerspectiveCorrectionCanvas.setVertices(vertices);
  };

  const handleResetClick = () => {
    resetPerspectiveCorrection();
    imagePerspectiveCorrectionCanvas?.resetVertices();
    imageCroppingCanvas?.resetMargins();
  };

  const handleRotateClick = () => {
    rotatePerspectiveUncorrectedImage();
    imagePerspectiveCorrectionCanvas?.resetVertices();
    imageCroppingCanvas?.resetMargins();
  };

  const handleSaveClick = async (aspectRatio?: number) => {
    if (!perspectiveCorrectedImage) {
      return;
    }
    const blob: Blob = await imageBitmapToBlob(perspectiveCorrectedImage, {
      drawImage: [
        DrawImage.cropMargins(imageCroppingCanvas?.getMargins()),
        DrawImage.expandToAspectRatio(aspectRatio),
      ],
    });
    saveAs(blob, getFilename(imageFileToCorrectPerspective, FILENAME_SUFFIX));
  };

  const handleWhiteBalanceClick = async () => {
    if (!perspectiveCorrectedImage) {
      return;
    }
    const blob: Blob = await imageBitmapToBlob(perspectiveCorrectedImage, {
      drawImage: DrawImage.cropMargins(imageCroppingCanvas?.getMargins()),
    });
    void setImageFileToAdjustColors(
      new File([blob], getFilename(imageFileToCorrectPerspective, FILENAME_SUFFIX) ?? '', {
        type: blob.type,
        lastModified: Date.now(),
      })
    );
    void setActiveTabKey(TabKey.ColorAdjustment);
  };

  const handleCancelClick = () => {
    abortPerspectiveAutoDetect();
  };

  const saveItems: MenuProps['items'] = [
    {
      key: 'save-4:5',
      label: t`Save expanded to 4:5`,
      icon: <DownloadOutlined />,
      onClick: () => {
        void handleSaveClick(4 / 5);
      },
    },
    {
      key: 'save-1.91:1',
      label: t`Save expanded to 1.91:1`,
      icon: <DownloadOutlined />,
      onClick: () => {
        void handleSaveClick(1.91 / 1);
      },
    },
  ];

  return (
    <LoadingIndicator
      loading={isLoading}
      downloadTip={perspectiveAutoDetectDownloadTip}
      onCancel={handleCancelClick}
    >
      <Flex vertical gap="small" className="u-tab-toolbar">
        <Space align="center" size={4}>
          <Typography.Text strong>
            <Trans>Select a photo to correct the perspective</Trans>
          </Typography.Text>
          <Tooltip
            title={t`Straightens skewed photos and removes unwanted edges. Use auto-detect or select 4 points to correct perspective distortion, then optionally drag margins to crop the image.`}
          >
            <QuestionCircleOutlined className="u-help-icon" />
          </Tooltip>
        </Space>
        <Space>
          <FileSelect onChange={handleFileChange} useReferencePhoto>
            <Trans>Select photo</Trans>
          </FileSelect>
          {perspectiveUncorrectedImage && (
            <>
              {!perspectiveCorrectedImage && (
                <>
                  <Button
                    icon={<AimOutlined />}
                    loading={isPerspectiveAutoDetectLoading}
                    onClick={() => {
                      void handleAutoDetectClick();
                    }}
                  >
                    <Trans>Auto-detect</Trans>
                  </Button>
                  <Button icon={<CheckOutlined />} onClick={handleApplyClick}>
                    <Trans>Apply</Trans>
                  </Button>
                </>
              )}
              {screens.sm ? (
                <>
                  <Button icon={<CloseOutlined />} onClick={handleResetClick}>
                    <Trans>Reset</Trans>
                  </Button>
                  {!perspectiveCorrectedImage && (
                    <Button icon={<RotateRightOutlined />} onClick={handleRotateClick}>
                      <Trans>Rotate</Trans>
                    </Button>
                  )}
                  {perspectiveCorrectedImage && (
                    <>
                      <Space.Compact>
                        <Button
                          icon={<DownloadOutlined />}
                          onClick={() => {
                            void handleSaveClick();
                          }}
                        >
                          <Trans>Save</Trans>
                        </Button>
                        <Dropdown menu={{items: saveItems}} trigger={['click']}>
                          <Button icon={<DownOutlined />} />
                        </Dropdown>
                      </Space.Compact>
                      <Button
                        icon={<BarChartOutlined />}
                        onClick={() => {
                          void handleWhiteBalanceClick();
                        }}
                      >
                        <Trans>White balance</Trans>
                      </Button>
                    </>
                  )}
                </>
              ) : (
                <Dropdown
                  trigger={['click']}
                  menu={{
                    items: [
                      {
                        key: 'reset',
                        label: t`Reset`,
                        icon: <CloseOutlined />,
                        onClick: handleResetClick,
                      },
                      ...(perspectiveCorrectedImage
                        ? [
                            {
                              key: 'save',
                              label: t`Save`,
                              icon: <DownloadOutlined />,
                              onClick: () => {
                                void handleSaveClick();
                              },
                            },
                            ...saveItems,
                            {
                              key: 'white-balance',
                              label: t`White balance`,
                              icon: <BarChartOutlined />,
                              onClick: () => {
                                void handleWhiteBalanceClick();
                              },
                            },
                          ]
                        : [
                            {
                              key: 'auto-detect',
                              label: t`Auto-detect`,
                              icon: <AimOutlined />,
                              onClick: () => {
                                void handleAutoDetectClick();
                              },
                            },
                            {
                              key: 'rotate',
                              label: t`Rotate`,
                              icon: <RotateRightOutlined />,
                              onClick: handleRotateClick,
                            },
                          ]),
                    ],
                  }}
                >
                  <Button icon={<MoreOutlined />} />
                </Dropdown>
              )}
            </>
          )}
        </Space>
        <div>
          {perspectiveUncorrectedImage && !perspectiveCorrectedImage && (
            <canvas ref={canvas1Ref} className={styles['previewCanvas']} />
          )}
          {perspectiveCorrectedImage && (
            <canvas ref={canvas2Ref} className={styles['previewCanvas']} />
          )}
        </div>
      </Flex>
    </LoadingIndicator>
  );
}
