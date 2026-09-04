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

import {HighlightOutlined} from '@ant-design/icons';
import {Trans, useLingui} from '@lingui/react/macro';
import {App, Button, Space, Typography} from 'antd';
import {useEffect} from 'react';

import {useAccessTo} from '@/hooks/useAccessTo';
import {useErrorNotification} from '@/hooks/useErrorNotification';
import {useOnnxModel} from '@/hooks/useOnnxModel';
import {Access} from '@/services/auth/types';
import type {CanvasPolygonDrawingMode} from '@/services/canvas/mode/canvas-polygon-drawing-mode';
import {INPAINTING_MODEL_ID, OnnxModelType, UPSCALING_MODEL_ID} from '@/services/ml/types';
import {useAppStore} from '@/stores/app-store';

interface Props {
  polygonDrawingMode: CanvasPolygonDrawingMode | null;
}

export function RemoveObjectsControls({polygonDrawingMode}: Readonly<Props>) {
  const setRemoveObjectsModel = useAppStore(state => state.setRemoveObjectsModel);
  const setRemoveObjectsUpscaleModel = useAppStore(state => state.setRemoveObjectsUpscaleModel);
  const removeObjects = useAppStore(state => state.removeObjects);

  const {t} = useLingui();
  const {notification} = App.useApp();

  const {
    model: inpaintModel,
    isLoading: isInpaintModelLoading,
    isError: isInpaintModelError,
  } = useOnnxModel(OnnxModelType.Inpainting, INPAINTING_MODEL_ID);

  const {
    model: upscaleModel,
    isLoading: isUpscaleModelLoading,
    isError: isUpscaleModelError,
  } = useOnnxModel(OnnxModelType.Upscaling, UPSCALING_MODEL_ID);

  useErrorNotification(
    isInpaintModelError || isUpscaleModelError,
    t`Unable to load the object removal model`,
    t`Check your connection and try again.`
  );

  const inpaintAccess = useAccessTo(inpaintModel);
  const upscaleAccess = useAccessTo(upscaleModel);

  useEffect(() => {
    setRemoveObjectsModel(inpaintModel);
  }, [inpaintModel, setRemoveObjectsModel]);

  useEffect(() => {
    setRemoveObjectsUpscaleModel(upscaleModel);
  }, [upscaleModel, setRemoveObjectsUpscaleModel]);

  const handleRemoveClick = async () => {
    const vertices = polygonDrawingMode?.getVertices() ?? [];
    if (vertices.length < 3) {
      notification.error({
        title: <Trans>Mark at least 3 points around the object you want to remove</Trans>,
        placement: 'top',
        duration: 10,
        showProgress: true,
      });
      return;
    }
    if (await removeObjects(vertices)) {
      polygonDrawingMode?.setVertices([]);
    }
  };

  const handleClearClick = () => {
    polygonDrawingMode?.setVertices([]);
  };

  return (
    <Space orientation="vertical">
      <Space wrap>
        <Button
          type="primary"
          icon={<HighlightOutlined />}
          loading={isInpaintModelLoading || isUpscaleModelLoading}
          disabled={inpaintAccess !== Access.Allowed || upscaleAccess !== Access.Allowed}
          onClick={() => {
            void handleRemoveClick();
          }}
        >
          <Trans>Remove objects</Trans>
        </Button>
        <Button onClick={handleClearClick}>
          <Trans>Clear</Trans>
        </Button>
      </Space>
      <Typography.Text type="secondary">
        <Trans>
          Mark around the object you want to remove, then drag the vertices to adjust or tap to
          remove
        </Trans>
      </Typography.Text>
      {(inpaintAccess === Access.Denied || upscaleAccess === Access.Denied) && (
        <Typography.Text type="warning">
          <Trans>Removing objects is available only to paid Patreon members</Trans>
        </Typography.Text>
      )}
    </Space>
  );
}
