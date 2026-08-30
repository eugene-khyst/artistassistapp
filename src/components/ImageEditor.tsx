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

import {CloseOutlined, RedoOutlined, UndoOutlined} from '@ant-design/icons';
import {Trans, useLingui} from '@lingui/react/macro';
import {Button, Col, Collapse, type CollapseProps, Flex, Popconfirm, Row, Space} from 'antd';
import {saveAs} from 'file-saver';
import {type ReactNode, useEffect, useMemo, useState} from 'react';

import {FileSelect} from '@/components/file/FileSelect';
import {ImageSaveButton} from '@/components/image/ImageSaveButton';
import {ImageViewSelector} from '@/components/image/ImageViewSelector';
import {AdjustColorsControls} from '@/components/image-editor/AdjustColorsControls';
import {CropControls} from '@/components/image-editor/CropControls';
import {RemoveBackgroundControls} from '@/components/image-editor/RemoveBackgroundControls';
import {RemoveObjectsControls} from '@/components/image-editor/RemoveObjectsControls';
import {StraightenControls} from '@/components/image-editor/StraightenControls';
import {LoadingIndicator} from '@/components/loading/LoadingIndicator';
import {EDIT_IMAGE_LABELS} from '@/components/messages';
import {useZoomableImageCanvas} from '@/hooks/useZoomableImageCanvas';
import {ImageEditorKey} from '@/image-editor';
import {CanvasPolygonDrawingMode} from '@/services/canvas/mode/canvas-polygon-drawing-mode';
import {ImageColorPickerMode} from '@/services/canvas/mode/image-color-picker-mode';
import {ImageCroppingMode} from '@/services/canvas/mode/image-cropping-mode';
import {ImageEditorMode, ImageEditorModeType} from '@/services/canvas/mode/image-editor-mode';
import {EditImageCommandType} from '@/services/image/edit-image-command';
import {blobToImageFile} from '@/services/image/image-file';
import {useAppStore} from '@/stores/app-store';
import {getFilename} from '@/utils/filename';
import {imageBitmapToBlob} from '@/utils/graphics';

import styles from './ImageEditor.module.css';

const FILENAME_SUFFIX = 'edited';

const IMAGE_EDITOR_MODE_TYPES: Record<ImageEditorKey, ImageEditorModeType> = {
  [ImageEditorKey.Straighten]: ImageEditorModeType.Quadrilateral,
  [ImageEditorKey.Crop]: ImageEditorModeType.Crop,
  [ImageEditorKey.AdjustColors]: ImageEditorModeType.ColorPicker,
  [ImageEditorKey.RemoveBackground]: ImageEditorModeType.RemoveBackground,
  [ImageEditorKey.RemoveObjects]: ImageEditorModeType.Polygon,
};

function imageEditorModeSupplier() {
  return new ImageEditorMode({
    [ImageEditorModeType.Quadrilateral]: new CanvasPolygonDrawingMode({
      lineWidth: 3,
      maxVertexCount: 4,
      shouldSortVertices: true,
      shouldConnectVertices: vertices => vertices.length === 4,
    }),
    [ImageEditorModeType.Crop]: new ImageCroppingMode(),
    [ImageEditorModeType.ColorPicker]: new ImageColorPickerMode({
      indicatorVisible: false,
      sampleRadius: 10,
      colorPickerImageIndex: 1,
    }),
    [ImageEditorModeType.RemoveBackground]: null,
    [ImageEditorModeType.Polygon]: new CanvasPolygonDrawingMode({
      lineWidth: 3,
      canRemoveVertices: true,
    }),
  });
}

type ImageEditorModeInstance = ReturnType<typeof imageEditorModeSupplier>;

async function editedImageBlob(): Promise<{blob: Blob; filename?: string} | undefined> {
  const {editedImage, imageFileToEdit, editImageHistory} = useAppStore.getState();
  if (!editedImage) {
    return;
  }
  const encodeOptions: ImageEncodeOptions = {
    type: editImageHistory.some(
      ({command}) => command.type === EditImageCommandType.RemoveBackground
    )
      ? 'image/png'
      : imageFileToEdit?.type || 'image/jpeg',
  };
  return {
    blob: await imageBitmapToBlob(editedImage, {encodeOptions}),
    filename: getFilename(imageFileToEdit, FILENAME_SUFFIX),
  };
}

interface ImageEditorControlsContext {
  imageEditorMode?: ImageEditorModeInstance;
  onColorPickerEnabledChange: (enabled: boolean) => void;
}

const IMAGE_EDITOR_CONTROLS: Record<
  ImageEditorKey,
  (context: ImageEditorControlsContext) => ReactNode
> = {
  [ImageEditorKey.Straighten]: ({imageEditorMode}) => (
    <StraightenControls
      polygonDrawingMode={imageEditorMode?.delegates[ImageEditorModeType.Quadrilateral] ?? null}
    />
  ),
  [ImageEditorKey.Crop]: ({imageEditorMode}) => (
    <CropControls croppingMode={imageEditorMode?.delegates[ImageEditorModeType.Crop] ?? null} />
  ),
  [ImageEditorKey.AdjustColors]: ({imageEditorMode, onColorPickerEnabledChange}) => (
    <AdjustColorsControls
      colorPickerMode={imageEditorMode?.delegates[ImageEditorModeType.ColorPicker] ?? null}
      onColorPickerEnabledChange={onColorPickerEnabledChange}
    />
  ),
  [ImageEditorKey.RemoveBackground]: () => <RemoveBackgroundControls />,
  [ImageEditorKey.RemoveObjects]: ({imageEditorMode}) => (
    <RemoveObjectsControls
      polygonDrawingMode={imageEditorMode?.delegates[ImageEditorModeType.Polygon] ?? null}
    />
  ),
};

export function ImageEditor() {
  const imageFileToEdit = useAppStore(state => state.imageFileToEdit);
  const imageToEdit = useAppStore(state => state.imageToEdit);
  const imageBeforeLastEdit = useAppStore(state => state.imageBeforeLastEdit);
  const editedImage = useAppStore(state => state.editedImage);
  const editImageHistory = useAppStore(state => state.editImageHistory);
  const undoneEditImageHistory = useAppStore(state => state.undoneEditImageHistory);
  const isEditedImageLoading = useAppStore(state => state.isEditedImageLoading);
  const editImageDownloadTip = useAppStore(state => state.editImageDownloadTip);
  const activeImageEditorKey = useAppStore(state => state.activeImageEditorKey);
  const straightenVertices = useAppStore(state => state.straightenVertices);
  const removeObjectsVertices = useAppStore(state => state.removeObjectsVertices);
  const cropRectangle = useAppStore(state => state.cropRectangle);
  const editImageOperation = useAppStore(state => state.editImageOperation);
  const setImageFileToEdit = useAppStore(state => state.setImageFileToEdit);
  const setActiveImageEditorKey = useAppStore(state => state.setActiveImageEditorKey);
  const openAdjustColors = useAppStore(state => state.openAdjustColors);
  const undoEditImage = useAppStore(state => state.undoEditImage);
  const redoEditImage = useAppStore(state => state.redoEditImage);
  const resetEditImage = useAppStore(state => state.resetEditImage);
  const saveRecentImageFile = useAppStore(state => state.saveRecentImageFile);

  const {t} = useLingui();

  const [isShowingOriginal, setIsShowingOriginal] = useState(false);
  const [isColorPickerEnabled, setIsColorPickerEnabled] = useState(false);
  const hasEditImageChanges = editImageHistory.length > 0;
  const images = useMemo(
    () => [editedImage, imageBeforeLastEdit ?? editedImage, imageToEdit],
    [editedImage, imageBeforeLastEdit, imageToEdit]
  );

  const {
    ref: canvasRef,
    zoomableImageCanvas,
    canvasMode: imageEditorMode,
  } = useZoomableImageCanvas(imageEditorModeSupplier, images, imageFileToEdit);

  useEffect(() => {
    const mode = activeImageEditorKey ? IMAGE_EDITOR_MODE_TYPES[activeImageEditorKey] : null;
    imageEditorMode?.setMode(
      isShowingOriginal || (mode === ImageEditorModeType.ColorPicker && !isColorPickerEnabled)
        ? null
        : mode
    );
  }, [activeImageEditorKey, imageEditorMode, isColorPickerEnabled, isShowingOriginal]);

  useEffect(() => {
    zoomableImageCanvas?.setImageIndex(isShowingOriginal ? 2 : 0);
  }, [isShowingOriginal, zoomableImageCanvas]);

  // Loading images and activating a mode both clear the selection, so restore it last.
  useEffect(() => {
    if (straightenVertices) {
      imageEditorMode?.delegates[ImageEditorModeType.Quadrilateral]?.setVertices(
        straightenVertices
      );
    }
  }, [imageEditorMode, straightenVertices]);

  useEffect(() => {
    if (removeObjectsVertices) {
      imageEditorMode?.delegates[ImageEditorModeType.Polygon]?.setVertices(removeObjectsVertices);
    }
  }, [imageEditorMode, removeObjectsVertices]);

  useEffect(() => {
    if (cropRectangle !== undefined) {
      imageEditorMode?.delegates[ImageEditorModeType.Crop]?.setCropRectangle(cropRectangle);
    }
  }, [cropRectangle, imageEditorMode]);

  const handleFileChange = ([file]: File[]) => {
    void setImageFileToEdit(file ?? null);
  };

  const handleSaveClick = async () => {
    const result = await editedImageBlob();
    if (!result) {
      return;
    }
    saveAs(result.blob, result.filename);
  };

  const handleSetAsReferenceClick = async () => {
    const result = await editedImageBlob();
    if (!result) {
      return;
    }
    void saveRecentImageFile(await blobToImageFile(result.blob, result.filename));
  };

  const handleUndoClick = () => {
    setIsShowingOriginal(false);
    void undoEditImage();
  };

  const handleRedoClick = () => {
    setIsShowingOriginal(false);
    void redoEditImage();
  };

  const handleResetClick = () => {
    setIsShowingOriginal(false);
    void resetEditImage();
  };

  const collapseItems: CollapseProps['items'] = Object.values(ImageEditorKey).map(key => ({
    key,
    label: t(EDIT_IMAGE_LABELS[key]),
    children: IMAGE_EDITOR_CONTROLS[key]({
      imageEditorMode,
      onColorPickerEnabledChange: setIsColorPickerEnabled,
    }),
  }));

  const handleCollapseChange = (key: string | string[]) => {
    const activeKey = Array.isArray(key) ? key[0] : key;
    if (activeKey) {
      setIsShowingOriginal(false);
    }
    const imageEditorKey = activeKey ? (activeKey as ImageEditorKey) : undefined;
    setActiveImageEditorKey(imageEditorKey);
    if (imageEditorKey === ImageEditorKey.AdjustColors) {
      void openAdjustColors();
    }
  };

  return (
    <LoadingIndicator
      loading={isEditedImageLoading}
      tip={editImageDownloadTip}
      onCancel={editImageOperation.abort}
    >
      <Row>
        {imageToEdit && (
          <Col xs={24} sm={12} lg={16}>
            <canvas ref={canvasRef} className={styles['previewCanvas']} />
          </Col>
        )}
        <Col xs={24} sm={12} lg={8} className={styles['sidePanel']}>
          <Flex vertical gap="small" className={styles['controls']}>
            <Space>
              <FileSelect onChange={handleFileChange} showUseReferencePhoto showUseCopiedImage>
                <Trans>Select image</Trans>
              </FileSelect>
              {editedImage && (
                <ImageSaveButton
                  onSave={handleSaveClick}
                  onSetAsReference={handleSetAsReferenceClick}
                  disabled={isShowingOriginal}
                />
              )}
            </Space>
            {editedImage && (
              <>
                <Space wrap>
                  <Button
                    icon={<UndoOutlined />}
                    onClick={handleUndoClick}
                    disabled={!hasEditImageChanges}
                  >
                    <Trans>Undo</Trans>
                  </Button>
                  <Button
                    icon={<RedoOutlined />}
                    onClick={handleRedoClick}
                    disabled={undoneEditImageHistory.length === 0}
                  >
                    <Trans>Redo</Trans>
                  </Button>
                  <Popconfirm
                    title={<Trans>All edits will be lost</Trans>}
                    okText={<Trans>Reset</Trans>}
                    cancelText={<Trans>Cancel</Trans>}
                    onConfirm={handleResetClick}
                  >
                    <Button icon={<CloseOutlined />} disabled={!hasEditImageChanges}>
                      <Trans>Reset</Trans>
                    </Button>
                  </Popconfirm>
                </Space>
                <ImageViewSelector
                  isShowingOriginal={isShowingOriginal}
                  resultLabel={<Trans>Edited</Trans>}
                  onChange={setIsShowingOriginal}
                />
                <Collapse
                  accordion
                  size="small"
                  activeKey={activeImageEditorKey}
                  items={collapseItems}
                  onChange={handleCollapseChange}
                />
              </>
            )}
          </Flex>
        </Col>
      </Row>
    </LoadingIndicator>
  );
}
