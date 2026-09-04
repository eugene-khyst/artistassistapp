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

import {CloseCircleOutlined, ScissorOutlined} from '@ant-design/icons';
import {WHITE_HEX} from '@eugene-khyst/artistassistapp-color-mixer';
import {Trans, useLingui} from '@lingui/react/macro';
import {Button, Form, Space, Typography} from 'antd';
import type {AggregationColor} from 'antd/es/color-picker/color';

import {ColorPicker} from '@/components/color/ColorPicker';
import {OnnxModelSelect} from '@/components/ml-model/OnnxModelSelect';
import {useErrorNotification} from '@/hooks/useErrorNotification';
import {useOnnxModels} from '@/hooks/useOnnxModels';
import {useSelectedCatalogItem} from '@/hooks/useSelectedCatalogItem';
import {Access} from '@/services/auth/types';
import {OnnxModelType} from '@/services/ml/types';
import {useAppStore} from '@/stores/app-store';

export function RemoveBackgroundControls() {
  const user = useAppStore(state => state.auth?.user);
  const removeBackgroundColor = useAppStore(state => state.removeBackgroundColor);
  const setRemoveBackgroundModel = useAppStore(state => state.setRemoveBackgroundModel);
  const setRemoveBackgroundColor = useAppStore(state => state.setRemoveBackgroundColor);
  const removeBackground = useAppStore(state => state.removeBackground);

  const {t} = useLingui();

  const {
    models,
    isLoading: isModelsLoading,
    isError: isModelsError,
  } = useOnnxModels(OnnxModelType.BackgroundRemoval);

  useErrorNotification(
    isModelsError,
    t`Unable to load the background removal modes`,
    t`Check your connection and try again.`
  );

  const {
    itemId: modelId,
    access,
    selectItem: selectModel,
  } = useSelectedCatalogItem({
    items: models,
    settingsKey: 'backgroundRemovalModel',
    setItem: setRemoveBackgroundModel,
  });

  return (
    <Space orientation="vertical">
      <Form.Item
        label={<Trans>Mode</Trans>}
        labelCol={{className: 'u-pb-0'}}
        validateStatus={access === Access.Denied ? 'warning' : undefined}
        extra={
          access === Access.Denied ? (
            <Typography.Text type="warning">
              <Trans>Selected mode is available only to paid Patreon members</Trans>
            </Typography.Text>
          ) : (
            !user && (
              <Typography.Text type="secondary">
                <Trans>Only a limited number of modes are available in the free version</Trans>
              </Typography.Text>
            )
          )
        }
        className="u-mb-0"
      >
        <OnnxModelSelect
          models={models}
          value={modelId}
          loading={isModelsLoading}
          onChange={selectModel}
          className="u-narrow-select"
        />
      </Form.Item>

      <Form.Item
        label={<Trans>Background</Trans>}
        labelCol={{className: 'u-pb-0'}}
        className="u-mb-0"
      >
        <Space.Compact>
          <ColorPicker
            title={t`Background`}
            presets={[
              {
                label: <Trans>White</Trans>,
                colors: [WHITE_HEX],
              },
            ]}
            disabledAlpha
            value={removeBackgroundColor ?? undefined}
            onChangeComplete={(color: AggregationColor) => {
              setRemoveBackgroundColor(color.toHexString());
            }}
            classNames={{popup: {root: 'color-picker-high-z-index'}}}
          />
          <Button
            icon={<CloseCircleOutlined />}
            title={t`Clear background color`}
            disabled={removeBackgroundColor === null}
            onClick={() => {
              setRemoveBackgroundColor(null);
            }}
          />
        </Space.Compact>
      </Form.Item>

      <Button
        type="primary"
        icon={<ScissorOutlined />}
        disabled={access !== Access.Allowed}
        onClick={() => {
          void removeBackground();
        }}
      >
        <Trans>Remove background</Trans>
      </Button>
    </Space>
  );
}
