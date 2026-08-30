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

import {AimOutlined, CheckOutlined, RotateRightOutlined} from '@ant-design/icons';
import {Trans} from '@lingui/react/macro';
import {App, Button, Space, Typography} from 'antd';
import {useEffect} from 'react';

import {useAccessTo} from '@/hooks/useAccessTo';
import {useErrorNotification} from '@/hooks/useErrorNotification';
import {useOnnxModel} from '@/hooks/useOnnxModel';
import {Access} from '@/services/auth/types';
import type {CanvasPolygonDrawingMode} from '@/services/canvas/mode/canvas-polygon-drawing-mode';
import {OnnxModelType} from '@/services/ml/types';
import {useAppStore} from '@/stores/app-store';

interface Props {
  polygonDrawingMode: CanvasPolygonDrawingMode | null;
}

export function StraightenControls({polygonDrawingMode}: Readonly<Props>) {
  const setStraightenModel = useAppStore(state => state.setStraightenModel);
  const autoDetectStraightenVertices = useAppStore(state => state.autoDetectStraightenVertices);
  const straightenImage = useAppStore(state => state.straightenImage);
  const rotateImageClockwise = useAppStore(state => state.rotateImageClockwise);

  const {notification} = App.useApp();

  const {
    model,
    isLoading: isModelLoading,
    isError: isModelError,
  } = useOnnxModel(OnnxModelType.PerspectiveCorrection, 'docaligner-fastvit-t8');

  useErrorNotification(
    isModelError,
    <Trans>Auto-detect is unavailable</Trans>,
    <Trans>Check your connection and try again. You can still adjust the 4 corners manually.</Trans>
  );

  const access = useAccessTo(model);

  useEffect(() => {
    setStraightenModel(model);
  }, [model, setStraightenModel]);

  const handleApplyClick = () => {
    const vertices = polygonDrawingMode?.getVertices() ?? [];
    if (vertices.length < 4) {
      notification.error({
        title: <Trans>Mark the 4 corners of your paper or canvas</Trans>,
        placement: 'top',
        duration: 10,
        showProgress: true,
      });
      return;
    }
    straightenImage(vertices);
  };

  const handleAutoDetectClick = async () => {
    if (!polygonDrawingMode) {
      return;
    }
    const vertices = await autoDetectStraightenVertices();
    if (vertices === undefined) {
      return;
    }
    if (!vertices) {
      notification.error({
        title: <Trans>Could not detect the paper or canvas automatically</Trans>,
        description: <Trans>Adjust the 4 corners manually.</Trans>,
        placement: 'top',
        duration: 10,
        showProgress: true,
      });
      return;
    }
    polygonDrawingMode.setVertices(vertices);
  };

  const handleRotateClick = () => {
    void rotateImageClockwise();
  };

  return (
    <Space orientation="vertical">
      <Space wrap>
        <Button type="primary" icon={<CheckOutlined />} onClick={handleApplyClick}>
          <Trans>Straighten</Trans>
        </Button>
        <Button
          icon={<AimOutlined />}
          loading={isModelLoading}
          disabled={!model || access !== Access.Allowed}
          onClick={() => {
            void handleAutoDetectClick();
          }}
        >
          <Trans>Auto-detect</Trans>
        </Button>
        <Button icon={<RotateRightOutlined />} onClick={handleRotateClick}>
          <Trans>Rotate</Trans>
        </Button>
      </Space>
      <Typography.Text type="secondary">
        <Trans>Mark the 4 corners of your paper or canvas, then drag them to adjust</Trans>
      </Typography.Text>
      {access === Access.Denied && (
        <Typography.Text type="warning">
          <Trans>Auto-detect is available only to paid Patreon members</Trans>
        </Typography.Text>
      )}
    </Space>
  );
}
