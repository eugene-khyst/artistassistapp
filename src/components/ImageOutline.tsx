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
  VideoCameraOutlined,
} from '@ant-design/icons';
import {Trans, useLingui} from '@lingui/react/macro';
import {
  App,
  Button,
  Divider,
  Dropdown,
  Form,
  Grid,
  Popover,
  Space,
  Tooltip,
  Typography,
} from 'antd';
import {clsx} from 'clsx';
import type {CSSProperties, ReactElement, ReactNode} from 'react';
import {cloneElement, useCallback, useEffect, useState} from 'react';

import {DEFAULT_GRID_SETTINGS, setGrid} from '@/components/grid/grid';
import {GridControls} from '@/components/grid/GridControls';
import {LightboxOverlay} from '@/components/lightbox/LightboxOverlay';
import {LoadingIndicator} from '@/components/loading/LoadingIndicator';
import {OnnxModelSelect} from '@/components/ml-model/OnnxModelSelect';
import {PrintImageDrawer} from '@/components/print/PrintImageDrawer';
import {useArMode} from '@/hooks/useArMode';
import {useLightbox} from '@/hooks/useLightbox';
import {useSelectedOnnxModel} from '@/hooks/useSelectedOnnxModel';
import {useZoomableImageCanvas} from '@/hooks/useZoomableImageCanvas';
import {GridCanvas} from '@/services/canvas/image/grid-canvas';
import {getDefaultModel} from '@/services/ml/models';
import type {OnnxModel} from '@/services/ml/types';
import {OnnxModelType} from '@/services/ml/types';
import {useAppStore} from '@/stores/app-store';
import {TabKey} from '@/tabs';
import {getFilename} from '@/utils/filename';

import {EmptyImage} from './empty/EmptyImage';
import styles from './ImageOutline.module.css';

const defaultGridSettings = {enabled: false};

const menuStyle: CSSProperties = {boxShadow: 'none'};

const gridCanvasSupplier = (canvas: HTMLCanvasElement): GridCanvas => {
  return new GridCanvas(canvas, {allowZoomBelowFit: true});
};

export function ImageOutline() {
  const user = useAppStore(state => state.auth?.user);
  const isAuthLoading = useAppStore(state => state.isAuthLoading);
  const grids = useAppStore(state => state.appSettings.grids);
  const imageFile = useAppStore(state => state.imageFile);
  const isOutlineImageLoading = useAppStore(state => state.isOutlineImageLoading);
  const outlineDownloadTip = useAppStore(state => state.outlineDownloadTip);
  const outlineImage = useAppStore(state => state.outlineImage);

  const activeTabKey = useAppStore(state => state.activeTabKey);

  const setOutlineModel = useAppStore(state => state.setOutlineModel);
  const abortOutline = useAppStore(state => state.abortOutline);

  const screens = Grid.useBreakpoint();

  const {notification} = App.useApp();

  const {t} = useLingui();

  const {models, modelId, isAccessAllowed, isModelsLoading, selectModel, setSelectedModelId} =
    useSelectedOnnxModel({
      type: OnnxModelType.LineDrawing,
      settingsKey: 'outlineModel',
      setModel: setOutlineModel,
    });

  const {ref: canvasRef, zoomableImageCanvas: gridCanvas} = useZoomableImageCanvas<GridCanvas>(
    gridCanvasSupplier,
    outlineImage
  );

  const [isOpenPrintImage, setIsOpenPrintImage] = useState<boolean>(false);

  const onLightboxEnter = useCallback(() => {
    gridCanvas?.disableAutoFit();
  }, [gridCanvas]);

  const {
    isLightbox,
    containerRef: lightboxContainerRef,
    open: openLightbox,
    close: closeLightbox,
  } = useLightbox({onEnter: onLightboxEnter});

  const onArPermissionDenied = useCallback(() => {
    notification.error({
      title: t`Camera access is required for AR tracing`,
      placement: 'top',
      duration: 10,
      showProgress: true,
    });
  }, [notification, t]);

  const {
    isArMode,
    videoRef,
    enter: enterArMode,
    exit: exitArMode,
  } = useArMode({
    isActive: activeTabKey === TabKey.Outline,
    onPermissionDenied: onArPermissionDenied,
  });

  const isLoading: boolean = isModelsLoading || isOutlineImageLoading || isAuthLoading;

  useEffect(() => {
    if (!gridCanvas) {
      return;
    }
    setGrid(gridCanvas, {
      ...DEFAULT_GRID_SETTINGS,
      ...defaultGridSettings,
      ...grids?.[TabKey.Outline],
    });
  }, [grids, gridCanvas]);

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
    if (!outlineImage) {
      return;
    }
    void gridCanvas?.saveAsImage(getFilename(imageFile, 'outline'));
  };

  const handleLightboxClick = async () => {
    if (isArMode) {
      exitArMode();
    }
    await openLightbox();
  };

  const handleCancelClick = () => {
    abortOutline();
    const quickModel = getDefaultModel(
      models,
      user,
      ({url, freeTier}: OnnxModel): boolean => !url && (!!user || !!freeTier)
    );
    setSelectedModelId(quickModel?.id);
  };

  const popupRender = useCallback(
    (menu: ReactNode) => (
      <div className={styles['popup']}>
        {cloneElement(
          menu as ReactElement<{
            style: CSSProperties;
          }>,
          {style: menuStyle}
        )}
        <Divider className="u-m-0" />
        <GridControls
          orientation="vertical"
          size={0}
          className={styles['dropdownGridControls']}
          gridCanvas={gridCanvas}
          defaultGridSettings={defaultGridSettings}
          disableable
        />
      </div>
    ),
    [gridCanvas]
  );

  if (!imageFile) {
    return <EmptyImage />;
  }

  return (
    <LoadingIndicator
      loading={isLoading}
      downloadTip={!!modelId && outlineDownloadTip}
      onCancel={!!modelId && handleCancelClick}
    >
      <Form.Item
        className="u-tab-toolbar"
        extra={
          !user &&
          (isAccessAllowed ? (
            <Typography.Text type="secondary">
              <Trans>Only a limited number of modes are available in the free version</Trans>
            </Typography.Text>
          ) : (
            <Typography.Text type="warning">
              <Trans>
                You&apos;ve selected a mode that is available to paid Patreon members only
              </Trans>
            </Typography.Text>
          ))
        }
      >
        <Space className={styles['actions']}>
          <Form.Item
            label={screens.sm ? t`Mode` : null}
            labelCol={{className: 'u-pb-0'}}
            className="u-mb-0"
            validateStatus={!isAccessAllowed ? 'warning' : undefined}
          >
            <OnnxModelSelect
              models={models}
              value={modelId}
              onChange={selectModel}
              className={styles['modelSelect']}
            />
          </Form.Item>
          {screens.sm ? (
            <>
              <Button icon={<PrinterOutlined />} onClick={handlePrintClick}>
                <Trans>Print</Trans>
              </Button>
              <Button
                icon={<DownloadOutlined />}
                onClick={() => {
                  handleSaveClick();
                }}
              >
                <Trans>Save</Trans>
              </Button>
              <Tooltip title={t`Enter lightbox mode to trace the outline through your paper.`}>
                <Button
                  icon={<BulbOutlined />}
                  onClick={() => {
                    void handleLightboxClick();
                  }}
                >
                  <Trans>Lightbox</Trans>
                </Button>
              </Tooltip>
              <Tooltip title={t`View the outline over the live camera to trace in AR.`}>
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
              <Popover
                trigger="click"
                forceRender
                content={
                  <GridControls
                    orientation="vertical"
                    size="small"
                    gridCanvas={gridCanvas}
                    defaultGridSettings={defaultGridSettings}
                    disableable
                  />
                }
              >
                <Button icon={<MoreOutlined />} />
              </Popover>
            </>
          ) : (
            <Dropdown
              trigger={['click']}
              menu={{
                items: [
                  {
                    key: 'print',
                    label: t`Print`,
                    icon: <PrinterOutlined />,
                    onClick: handlePrintClick,
                  },
                  {
                    key: 'save',
                    label: t`Save`,
                    icon: <DownloadOutlined />,
                    onClick: () => {
                      handleSaveClick();
                    },
                  },
                  {
                    key: 'lightbox',
                    label: t`Light box`,
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
                ],
              }}
              popupRender={popupRender}
            >
              <Button icon={<MoreOutlined />} />
            </Dropdown>
          )}
        </Space>
      </Form.Item>
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
            isArMode && styles['canvasAr']
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
