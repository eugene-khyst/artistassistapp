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
import {Button, Form, Space, Typography} from 'antd';
import {useEffect} from 'react';

import {OnnxModelSelect} from '@/components/ml-model/OnnxModelSelect';
import {useAccessTo} from '@/hooks/useAccessTo';
import {useErrorNotification} from '@/hooks/useErrorNotification';
import {useOnnxModel} from '@/hooks/useOnnxModel';
import {useOnnxModels} from '@/hooks/useOnnxModels';
import {useSelectedCatalogItem} from '@/hooks/useSelectedCatalogItem';
import {Access} from '@/services/auth/types';
import {OnnxModelType, UPSCALING_MODEL_ID} from '@/services/ml/types';
import {useAppStore} from '@/stores/app-store';

export function ColorizeControls() {
  const user = useAppStore(state => state.auth?.user);
  const setColorizeModel = useAppStore(state => state.setColorizeModel);
  const setColorizeUpscaleModel = useAppStore(state => state.setColorizeUpscaleModel);
  const colorizeImage = useAppStore(state => state.colorizeImage);

  const {t} = useLingui();

  const {
    models: colorizeModels,
    isLoading: isColorizeModelsLoading,
    isError: isColorizeModelsError,
  } = useOnnxModels(OnnxModelType.Colorization);

  const {
    model: upscaleModel,
    isLoading: isUpscaleModelLoading,
    isError: isUpscaleModelError,
  } = useOnnxModel(OnnxModelType.Upscaling, UPSCALING_MODEL_ID);

  useErrorNotification(
    isColorizeModelsError || isUpscaleModelError,
    t`Unable to load the colorization modes`,
    t`Check your connection and try again.`
  );

  const {
    hasPaidItems,
    itemId: colorizeModelId,
    access: colorizeAccess,
    selectItem: selectColorizeModel,
  } = useSelectedCatalogItem({
    items: colorizeModels,
    settingsKey: 'colorizeModel',
    setItem: setColorizeModel,
  });

  const upscaleAccess = useAccessTo(upscaleModel);

  useEffect(() => {
    setColorizeUpscaleModel(upscaleModel);
  }, [upscaleModel, setColorizeUpscaleModel]);

  return (
    <Space orientation="vertical">
      <Form.Item
        label={<Trans>Mode</Trans>}
        labelCol={{className: 'u-pb-0'}}
        validateStatus={colorizeAccess === Access.Denied ? 'warning' : undefined}
        extra={
          colorizeAccess === Access.Denied ? (
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
          )
        }
        className="u-mb-0"
      >
        <OnnxModelSelect
          models={colorizeModels}
          value={colorizeModelId}
          loading={isColorizeModelsLoading}
          onChange={selectColorizeModel}
          className="u-narrow-select"
        />
      </Form.Item>

      <Button
        type="primary"
        icon={<BgColorsOutlined />}
        loading={isColorizeModelsLoading || isUpscaleModelLoading}
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
