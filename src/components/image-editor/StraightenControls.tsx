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

import {useErrorNotification} from '@/hooks/useErrorNotification';
import {useOnnxModel} from '@/hooks/useOnnxModel';
import {hasAccessTo} from '@/services/auth/utils';
import type {CanvasPolygonDrawingMode} from '@/services/canvas/mode/canvas-polygon-drawing-mode';
import {OnnxModelType} from '@/services/ml/types';
import {useAppStore} from '@/stores/app-store';

interface Props {
  polygonDrawingMode: CanvasPolygonDrawingMode | null;
}

export function StraightenControls({polygonDrawingMode}: Readonly<Props>) {
  const user = useAppStore(state => state.auth?.user);
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

  useErrorNotification(isModelError, <Trans>Error while fetching ML model data</Trans>);

  const isAccessAllowed = hasAccessTo(user, model);

  useEffect(() => {
    setStraightenModel(model);
  }, [model, setStraightenModel]);

  const handleApplyClick = () => {
    const vertices = polygonDrawingMode?.getVertices() ?? [];
    if (vertices.length < 4) {
      notification.error({
        title: <Trans>Select 4 points to correct perspective distortion</Trans>,
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
        description: <Trans>Adjust the 4 points manually.</Trans>,
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
    <Space orientation="vertical" className="u-w-100">
      <Space wrap>
        <Button type="primary" icon={<CheckOutlined />} onClick={handleApplyClick}>
          <Trans>Straighten</Trans>
        </Button>
        <Button
          icon={<AimOutlined />}
          loading={isModelLoading}
          disabled={!model || !isAccessAllowed}
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
      {!isAccessAllowed && (
        <Typography.Text type="warning">
          <Trans>Auto-detect is available to paid Patreon members only</Trans>
        </Typography.Text>
      )}
    </Space>
  );
}
