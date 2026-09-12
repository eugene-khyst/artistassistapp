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
  BulbOutlined,
  DownloadOutlined,
  MoreOutlined,
  PrinterOutlined,
  TableOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import {Trans, useLingui} from '@lingui/react/macro';
import {
  App,
  Button,
  Divider,
  Dropdown,
  Flex,
  Form,
  Grid,
  Popover,
  Space,
  Tooltip,
  Typography,
} from 'antd';
import {clsx} from 'clsx';
import {type ReactNode, useCallback, useEffect, useMemo, useState} from 'react';

import {DEFAULT_GRID_SETTINGS, setGrid} from '@/components/grid/grid';
import {GridControls} from '@/components/grid/GridControls';
import {ImageSaveButton} from '@/components/image/ImageSaveButton';
import {ImageViewSelector} from '@/components/image/ImageViewSelector';
import {LightboxOverlay} from '@/components/lightbox/LightboxOverlay';
import {LoadingIndicator} from '@/components/loading/LoadingIndicator';
import {OnnxModelSelect} from '@/components/ml-model/OnnxModelSelect';
import {PrintImageDrawer} from '@/components/print/PrintImageDrawer';
import {useArMode} from '@/hooks/useArMode';
import {useErrorNotification} from '@/hooks/useErrorNotification';
import {useLightbox} from '@/hooks/useLightbox';
import {useOnnxModels} from '@/hooks/useOnnxModels';
import {useSelectedCatalogItem} from '@/hooks/useSelectedCatalogItem';
import {useZoomableImageCanvas} from '@/hooks/useZoomableImageCanvas';
import {Access} from '@/services/auth/types';
import {ZoomableImageCanvas} from '@/services/canvas/image/zoomable-image-canvas';
import {GridCanvasMode} from '@/services/canvas/mode/grid-canvas-mode';
import {OnnxModelType, SOBEL_EDGE_DETECTION_MODEL_ID} from '@/services/ml/types';
import {useAppStore} from '@/stores/app-store';
import {TabKey} from '@/tabs';
import {getFilename} from '@/utils/filename';

import {EmptyImage} from './empty/EmptyImage';
import styles from './ImageOutline.module.css';

const defaultGridSettings = {enabled: false};

const gridDrawingModeSupplier = (): GridCanvasMode => {
  return new GridCanvasMode();
};

export function ImageOutline() {
  const user = useAppStore(state => state.auth?.user);
  const grids = useAppStore(state => state.appSettings.grids);
  const selectedImageFile = useAppStore(state => state.selectedImageFile);
  const isOutlineImageLoading = useAppStore(state => state.isOutlineImageLoading);
  const outlineDownloadTip = useAppStore(state => state.outlineDownloadTip);
  const outlineImage = useAppStore(state => state.outlineImage);
  const originalImage = useAppStore(state => state.originalImage);
  const activeTabKey = useAppStore(state => state.activeTabKey);

  const setOutlineModel = useAppStore(state => state.setOutlineModel);
  const abortOutline = useAppStore(state => state.abortOutline);

  const screens = Grid.useBreakpoint();

  const {notification} = App.useApp();

  const {t} = useLingui();

  const {
    models,
    isLoading: isModelsLoading,
    isError: isModelsError,
  } = useOnnxModels(OnnxModelType.LineDrawing);

  useErrorNotification(
    isModelsError,
    t`Unable to load the outline modes`,
    t`Check your connection and try again.`
  );

  const {
    hasPaidItems,
    itemId: modelId,
    access,
    selectItem: selectModel,
    setSelectedItemId: setSelectedModelId,
  } = useSelectedCatalogItem({
    items: models,
    settingsKey: 'outlineModel',
    setItem: setOutlineModel,
  });

  const images = useMemo(() => [outlineImage, originalImage], [outlineImage, originalImage]);
  const displayDimension = useMemo(
    () => (outlineImage ? ZoomableImageCanvas.imageDimension(outlineImage) : undefined),
    [outlineImage]
  );

  const {
    ref: canvasRef,
    zoomableImageCanvas,
    canvasMode: gridDrawingMode,
  } = useZoomableImageCanvas(
    gridDrawingModeSupplier,
    images,
    selectedImageFile?.digest,
    displayDimension,
    {allowZoomBelowFit: true}
  );

  const [isOpenPrintImage, setIsOpenPrintImage] = useState<boolean>(false);
  const [isShowingOriginal, setIsShowingOriginal] = useState<boolean>(false);

  const onLightboxEnter = useCallback(() => {
    zoomableImageCanvas?.disableAutoFit();
  }, [zoomableImageCanvas]);

  const {
    isLightbox,
    containerRef: lightboxContainerRef,
    open: openLightbox,
    close: closeLightbox,
  } = useLightbox({onEnter: onLightboxEnter});

  const onArPermissionDenied = useCallback(() => {
    notification.error({
      title: <Trans>Camera access is required for AR tracing</Trans>,
      placement: 'top',
      duration: 10,
      showProgress: true,
    });
  }, [notification]);

  const {
    isArMode,
    videoRef,
    enter: enterArMode,
    exit: exitArMode,
  } = useArMode({
    isActive: activeTabKey === TabKey.Outline,
    onPermissionDenied: onArPermissionDenied,
  });

  const isLoading: boolean = isModelsLoading || isOutlineImageLoading;

  const isCancelable: boolean = isOutlineImageLoading;

  useEffect(() => {
    if (!gridDrawingMode) {
      return;
    }
    setGrid(gridDrawingMode, {
      ...DEFAULT_GRID_SETTINGS,
      ...defaultGridSettings,
      ...grids?.[TabKey.Outline],
    });
  }, [grids, gridDrawingMode]);

  useEffect(() => {
    zoomableImageCanvas?.setImageIndex(isShowingOriginal && outlineImage ? 1 : 0);
  }, [zoomableImageCanvas, isShowingOriginal, outlineImage]);

  const handleArToggle = async () => {
    if (isArMode) {
      exitArMode();
      return;
    }
    if (isLightbox) {
      await closeLightbox();
    }
    await enterArMode();
  };

  const handlePrintClick = () => {
    setIsOpenPrintImage(true);
  };

  const handleSaveClick = () => {
    if (!outlineImage || isShowingOriginal) {
      return;
    }
    void zoomableImageCanvas?.saveAsImage(getFilename(selectedImageFile, 'outline'));
  };

  const handleLightboxClick = async () => {
    if (isArMode) {
      exitArMode();
    }
    await openLightbox();
  };

  const handleCancelClick = () => {
    abortOutline();
    setSelectedModelId(SOBEL_EDGE_DETECTION_MODEL_ID);
  };

  const popupRender = useCallback(
    (menu: ReactNode) => (
      <div className="u-popup-panel">
        {menu}
        <Divider className="u-m-0" />
        <GridControls
          orientation="vertical"
          size={0}
          className={styles['dropdownGridControls']}
          gridDrawingMode={gridDrawingMode}
          defaultGridSettings={defaultGridSettings}
          disableable
        />
      </div>
    ),
    [gridDrawingMode]
  );

  if (!selectedImageFile) {
    return <EmptyImage />;
  }

  return (
    <LoadingIndicator
      loading={isLoading}
      tip={modelId ? outlineDownloadTip : null}
      onCancel={isCancelable && handleCancelClick}
    >
      <div className="u-tab-view">
        <Flex vertical className="u-tab-toolbar">
          <Space wrap className="u-flex">
            <Form.Item
              label={screens.sm ? <Trans>Mode</Trans> : null}
              labelCol={{className: 'u-pb-0'}}
              className="u-mb-0"
              validateStatus={access === Access.Denied ? 'warning' : undefined}
            >
              <OnnxModelSelect
                aria-label={t`Mode`}
                models={models}
                value={modelId}
                onChange={selectModel}
                className="u-narrow-select"
              />
            </Form.Item>
            <ImageViewSelector
              isShowingOriginal={isShowingOriginal}
              resultLabel={<Trans>Outline</Trans>}
              onChange={setIsShowingOriginal}
              disabled={!outlineImage}
            />
            {screens.sm && (
              <>
                <Tooltip
                  title={<Trans>Enter lightbox mode to trace the outline through your paper</Trans>}
                >
                  <Button
                    icon={<BulbOutlined />}
                    onClick={() => {
                      void handleLightboxClick();
                    }}
                  >
                    <Trans>Lightbox</Trans>
                  </Button>
                </Tooltip>
                <Tooltip
                  title={<Trans>View the outline over the live camera to trace in AR</Trans>}
                >
                  <Button
                    type={isArMode ? 'primary' : 'default'}
                    icon={<VideoCameraOutlined />}
                    onClick={() => {
                      void handleArToggle();
                    }}
                  >
                    {isArMode ? <Trans>Exit AR</Trans> : <Trans>AR</Trans>}
                  </Button>
                </Tooltip>
                {screens.md && (
                  <>
                    <Popover
                      trigger="click"
                      forceRender
                      content={
                        <GridControls
                          orientation="vertical"
                          size="small"
                          gridDrawingMode={gridDrawingMode}
                          defaultGridSettings={defaultGridSettings}
                          disableable
                        />
                      }
                    >
                      <Button icon={<TableOutlined />}>
                        <Trans>Grid</Trans>
                      </Button>
                    </Popover>
                    <Button
                      icon={<PrinterOutlined />}
                      onClick={handlePrintClick}
                      disabled={isShowingOriginal}
                    >
                      <Trans>Print</Trans>
                    </Button>
                    <ImageSaveButton onSave={handleSaveClick} disabled={isShowingOriginal} />
                  </>
                )}
              </>
            )}
            {!screens.md && (
              <Dropdown
                trigger={['click']}
                menu={{
                  items: [
                    ...(!screens.sm
                      ? [
                          {
                            key: 'lightbox',
                            label: <Trans>Light box</Trans>,
                            title: t`Enter lightbox mode to trace the outline through your paper.`,
                            icon: <BulbOutlined />,
                            onClick: () => {
                              void handleLightboxClick();
                            },
                          },
                          {
                            key: 'ar',
                            label: isArMode ? t`Exit AR` : t`AR`,
                            title: t`View the outline over the live camera to trace in AR.`,
                            icon: <VideoCameraOutlined />,
                            onClick: () => {
                              void handleArToggle();
                            },
                          },
                        ]
                      : []),
                    {
                      key: 'print',
                      label: <Trans>Print</Trans>,
                      icon: <PrinterOutlined />,
                      onClick: handlePrintClick,
                      disabled: isShowingOriginal,
                    },
                    {
                      key: 'save',
                      label: <Trans>Save</Trans>,
                      icon: <DownloadOutlined />,
                      onClick: handleSaveClick,
                      disabled: isShowingOriginal,
                    },
                  ],
                }}
                popupRender={popupRender}
              >
                <Button icon={<MoreOutlined />} aria-label={t`More actions`} />
              </Dropdown>
            )}
          </Space>
          {access === Access.Denied ? (
            <Typography.Text type="warning">
              <Trans>Selected mode is available only to paid Patreon members</Trans>
            </Typography.Text>
          ) : (
            !user &&
            hasPaidItems && (
              <Typography.Text type="secondary">
                <Trans>Only a limited number of modes are available in the free version</Trans>
              </Typography.Text>
            )
          )}
        </Flex>
        <div
          ref={lightboxContainerRef}
          className={clsx(styles['lightboxContainer'], isLightbox && styles['lightboxBackground'])}
        >
          {isArMode && (
            <video ref={videoRef} autoPlay muted playsInline className={styles['arVideo']} />
          )}
          <canvas
            ref={canvasRef}
            className={clsx(
              styles['previewCanvas'],
              isLightbox ? styles['canvasLightbox'] : styles['canvasNormal'],
              isArMode &&
                (isShowingOriginal || !outlineImage
                  ? styles['canvasArOriginal']
                  : styles['canvasArOutline'])
            )}
          />
          {isLightbox && (
            <LightboxOverlay
              onUnlock={() => {
                void closeLightbox();
              }}
            />
          )}
        </div>
      </div>
      <PrintImageDrawer
        image={outlineImage}
        open={isOpenPrintImage}
        onClose={() => {
          setIsOpenPrintImage(false);
        }}
      />
    </LoadingIndicator>
  );
}
