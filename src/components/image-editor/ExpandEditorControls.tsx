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

import {CheckOutlined} from '@ant-design/icons';
import {WHITE_HEX} from '@eugene-khyst/artistassistapp-color-mixer';
import {Trans, useLingui} from '@lingui/react/macro';
import {
  Button,
  type CheckboxOptionType,
  Form,
  Input,
  InputNumber,
  Radio,
  type RadioChangeEvent,
  Select,
  Space,
  Typography,
} from 'antd';
import type {AggregationColor} from 'antd/es/color-picker/color';
import {useEffect} from 'react';

import {ColorPicker} from '@/components/color/ColorPicker';
import {useAccessTo} from '@/hooks/useAccessTo';
import {useErrorNotification} from '@/hooks/useErrorNotification';
import {useOnnxModel} from '@/hooks/useOnnxModel';
import {Access} from '@/services/auth/types';
import type {ImageExpandingMode} from '@/services/canvas/mode/image-expanding-mode';
import {imageAspectRatio, imageAspectRatioLabel} from '@/services/image/aspect-ratio';
import {ExpandFillMode, ExpandMode} from '@/services/image/expand-controls';
import {getImageExpansion} from '@/services/image/expand-image';
import {INPAINTING_MODEL_ID, OnnxModelType, UPSCALING_MODEL_ID} from '@/services/ml/types';
import {useAppStore} from '@/stores/app-store';

import styles from './ExpandEditorControls.module.css';
import {IMAGE_ASPECT_RATIO_OPTIONS} from './image-aspect-ratio-options';

interface Props {
  expandingMode: ImageExpandingMode | null;
}

export function ExpandEditorControls({expandingMode}: Readonly<Props>) {
  const editedImage = useAppStore(state => state.editedImage);
  const expandControls = useAppStore(state => state.expandControls);
  const setExpandControls = useAppStore(state => state.setExpandControls);
  const setExpandModel = useAppStore(state => state.setExpandModel);
  const setExpandUpscaleModel = useAppStore(state => state.setExpandUpscaleModel);
  const expandImage = useAppStore(state => state.expandImage);

  const {t} = useLingui();
  const {
    model: inpaintingModel,
    isLoading: isInpaintingModelLoading,
    isError: isInpaintingModelError,
  } = useOnnxModel(OnnxModelType.Inpainting, INPAINTING_MODEL_ID);
  const inpaintingAccess = useAccessTo(inpaintingModel);

  const {
    model: upscaleModel,
    isLoading: isUpscaleModelLoading,
    isError: isUpscaleModelError,
  } = useOnnxModel(OnnxModelType.Upscaling, UPSCALING_MODEL_ID);
  const upscaleAccess = useAccessTo(upscaleModel);

  useErrorNotification(
    isInpaintingModelError || isUpscaleModelError,
    t`Unable to load the smart expansion model`,
    t`Check your connection and try again.`
  );

  useEffect(() => {
    setExpandModel(inpaintingModel);
  }, [inpaintingModel, setExpandModel]);

  useEffect(() => {
    setExpandUpscaleModel(upscaleModel);
  }, [upscaleModel, setExpandUpscaleModel]);

  useEffect(() => {
    expandingMode?.setControls(expandControls);
  }, [expandControls, expandingMode]);

  const sizeModeOptions: CheckboxOptionType<ExpandMode>[] = [
    {value: ExpandMode.AspectRatio, label: <Trans>Aspect ratio</Trans>},
    {value: ExpandMode.Margins, label: <Trans>Margins</Trans>},
  ];
  const fillModeOptions: CheckboxOptionType<ExpandFillMode>[] = [
    {value: ExpandFillMode.Color, label: <Trans>Color</Trans>},
    {value: ExpandFillMode.Smart, label: <Trans>Smart</Trans>},
  ];

  const expansion = editedImage ? getImageExpansion(editedImage, expandControls) : null;
  const canExpand = !!expansion?.margins.length;
  const isSmart = expandControls.fillMode === ExpandFillMode.Smart;
  const outputWidth = expansion?.bounds.width;
  const outputHeight = expansion?.bounds.height;

  return (
    <Space orientation="vertical" className="u-w-100">
      <Form.Item
        label={<Trans>Expand by</Trans>}
        labelCol={{className: 'u-pb-0'}}
        className="u-mb-0"
      >
        <Radio.Group
          options={sizeModeOptions}
          value={expandControls.sizeMode}
          onChange={(event: RadioChangeEvent) => {
            setExpandControls({
              sizeMode: event.target.value as ExpandMode,
            });
          }}
          optionType="button"
          buttonStyle="solid"
        />
      </Form.Item>

      {expandControls.sizeMode === ExpandMode.AspectRatio ? (
        <Form.Item
          label={<Trans>Aspect ratio</Trans>}
          labelCol={{className: 'u-pb-0'}}
          className="u-mb-0"
        >
          <Select
            value={imageAspectRatioLabel(expandControls.aspectRatio)}
            options={IMAGE_ASPECT_RATIO_OPTIONS}
            onChange={label => {
              const aspectRatio = imageAspectRatio(label);
              if (aspectRatio) {
                setExpandControls({aspectRatio});
              }
            }}
            popupMatchSelectWidth={false}
          />
        </Form.Item>
      ) : (
        <Space wrap>
          <Form.Item
            label={<Trans>Horizontal</Trans>}
            labelCol={{className: 'u-pb-0'}}
            className="u-mb-0"
          >
            <Space.Compact>
              <InputNumber
                min={0}
                max={100}
                className={styles['marginInput']}
                value={expandControls.marginX}
                onChange={marginX => {
                  setExpandControls({marginX: marginX ?? 0});
                }}
              />
              <Input placeholder="%" className={styles['unitInput']} disabled />
            </Space.Compact>
          </Form.Item>
          <Form.Item
            label={<Trans>Vertical</Trans>}
            labelCol={{className: 'u-pb-0'}}
            className="u-mb-0"
          >
            <Space.Compact>
              <InputNumber
                min={0}
                max={100}
                className={styles['marginInput']}
                value={expandControls.marginY}
                onChange={marginY => {
                  setExpandControls({marginY: marginY ?? 0});
                }}
              />
              <Input placeholder="%" className={styles['unitInput']} disabled />
            </Space.Compact>
          </Form.Item>
        </Space>
      )}

      <Form.Item label={<Trans>Fill</Trans>} labelCol={{className: 'u-pb-0'}} className="u-mb-0">
        <Radio.Group
          options={fillModeOptions}
          value={expandControls.fillMode}
          onChange={(event: RadioChangeEvent) => {
            setExpandControls({
              fillMode: event.target.value as ExpandFillMode,
            });
          }}
          optionType="button"
          buttonStyle="solid"
        />
      </Form.Item>

      {!isSmart && (
        <Form.Item label={<Trans>Color</Trans>} labelCol={{className: 'u-pb-0'}} className="u-mb-0">
          <ColorPicker
            title={t`Color`}
            presets={[{label: <Trans>White</Trans>, colors: [WHITE_HEX]}]}
            disabledAlpha
            value={expandControls.color}
            onChangeComplete={(color: AggregationColor) => {
              setExpandControls({color: color.toHexString()});
            }}
            classNames={{popup: {root: 'color-picker-high-z-index'}}}
          />
        </Form.Item>
      )}

      {expansion && (
        <Typography.Text type="secondary">
          <Trans>
            New size: {outputWidth} × {outputHeight}
          </Trans>
        </Typography.Text>
      )}

      {isSmart && (inpaintingAccess === Access.Denied || upscaleAccess === Access.Denied) && (
        <Typography.Text type="warning">
          <Trans>Smart expansion is available only to paid Patreon members</Trans>
        </Typography.Text>
      )}

      <Button
        type="primary"
        icon={<CheckOutlined />}
        loading={isSmart && (isInpaintingModelLoading || isUpscaleModelLoading)}
        disabled={
          !canExpand ||
          (isSmart && (inpaintingAccess !== Access.Allowed || upscaleAccess !== Access.Allowed))
        }
        onClick={() => {
          void expandImage();
        }}
      >
        <Trans>Expand</Trans>
      </Button>
    </Space>
  );
}
