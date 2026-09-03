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

import {ZoomInOutlined} from '@ant-design/icons';
import {Trans, useLingui} from '@lingui/react/macro';
import {Button, Space, Typography} from 'antd';
import {useEffect} from 'react';

import {useAccessTo} from '@/hooks/useAccessTo';
import {useErrorNotification} from '@/hooks/useErrorNotification';
import {useOnnxModel} from '@/hooks/useOnnxModel';
import {Access} from '@/services/auth/types';
import {upscaledSize} from '@/services/image/upscale';
import {OnnxModelType, UPSCALING_MODEL_ID} from '@/services/ml/types';
import {useAppStore} from '@/stores/app-store';

export function UpscaleControls() {
  const editedImage = useAppStore(state => state.editedImage);
  const setUpscaleModel = useAppStore(state => state.setUpscaleModel);
  const upscaleImage = useAppStore(state => state.upscaleImage);

  const {t} = useLingui();

  const {
    model,
    isLoading: isModelLoading,
    isError: isModelError,
  } = useOnnxModel(OnnxModelType.Upscaling, UPSCALING_MODEL_ID);

  useErrorNotification(
    isModelError,
    t`Unable to load the upscale model`,
    t`Check your connection and try again.`
  );

  const access = useAccessTo(model);

  useEffect(() => {
    setUpscaleModel(model);
  }, [model, setUpscaleModel]);

  const upscaled = editedImage ? upscaledSize(editedImage) : null;
  const outputWidth = upscaled?.width ?? 0;
  const outputHeight = upscaled?.height ?? 0;

  return (
    <Space orientation="vertical">
      {editedImage &&
        (upscaled ? (
          <Typography.Text>
            <Trans>
              New size: {outputWidth} × {outputHeight}
            </Trans>
          </Typography.Text>
        ) : (
          <Typography.Text type="warning">
            <Trans>This image is already too large to upscale</Trans>
          </Typography.Text>
        ))}

      <Button
        type="primary"
        icon={<ZoomInOutlined />}
        loading={isModelLoading}
        disabled={!upscaled || access !== Access.Allowed}
        onClick={() => {
          void upscaleImage();
        }}
      >
        <Trans>Upscale</Trans>
      </Button>
    </Space>
  );
}
