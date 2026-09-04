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

import {BgColorsOutlined} from '@ant-design/icons';
import {Trans, useLingui} from '@lingui/react/macro';
import {Button, Space} from 'antd';
import {useEffect} from 'react';

import {useAccessTo} from '@/hooks/useAccessTo';
import {useErrorNotification} from '@/hooks/useErrorNotification';
import {useOnnxModel} from '@/hooks/useOnnxModel';
import {Access} from '@/services/auth/types';
import {COLORIZATION_MODEL_ID, OnnxModelType, UPSCALING_MODEL_ID} from '@/services/ml/types';
import {useAppStore} from '@/stores/app-store';

export function ColorizeControls() {
  const setColorizeModel = useAppStore(state => state.setColorizeModel);
  const setColorizeUpscaleModel = useAppStore(state => state.setColorizeUpscaleModel);
  const colorizeImage = useAppStore(state => state.colorizeImage);

  const {t} = useLingui();

  const {
    model: colorizeModel,
    isLoading: isColorizeModelLoading,
    isError: isColorizeModelError,
  } = useOnnxModel(OnnxModelType.Colorization, COLORIZATION_MODEL_ID);

  const {
    model: upscaleModel,
    isLoading: isUpscaleModelLoading,
    isError: isUpscaleModelError,
  } = useOnnxModel(OnnxModelType.Upscaling, UPSCALING_MODEL_ID);

  useErrorNotification(
    isColorizeModelError || isUpscaleModelError,
    t`Unable to load the colorization model`,
    t`Check your connection and try again.`
  );

  const colorizeAccess = useAccessTo(colorizeModel);
  const upscaleAccess = useAccessTo(upscaleModel);

  useEffect(() => {
    setColorizeModel(colorizeModel);
  }, [colorizeModel, setColorizeModel]);

  useEffect(() => {
    setColorizeUpscaleModel(upscaleModel);
  }, [upscaleModel, setColorizeUpscaleModel]);

  return (
    <Space orientation="vertical">
      <Button
        type="primary"
        icon={<BgColorsOutlined />}
        loading={isColorizeModelLoading || isUpscaleModelLoading}
        disabled={colorizeAccess !== Access.Allowed || upscaleAccess !== Access.Allowed}
        onClick={() => {
          void colorizeImage();
        }}
      >
        <Trans>Colorize</Trans>
      </Button>
    </Space>
  );
}
