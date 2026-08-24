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

import {kelvinToRgb, range, rgbToHex} from '@eugene-khyst/artistassistapp-color-mixer';
import {Trans, useLingui} from '@lingui/react/macro';
import {
  type CheckboxOptionType,
  Form,
  Radio,
  type RadioChangeEvent,
  Slider,
  Space,
  Typography,
} from 'antd';
import type {AggregationColor} from 'antd/es/color-picker/color';
import type {SliderMarks} from 'antd/es/slider';
import {useCallback, useEffect} from 'react';

import {ColorPicker} from '@/components/color/ColorPicker';
import {
  ImageColorPickerEventType,
  type ImageColorPickerMode,
  type PipettePointSetEvent,
} from '@/services/canvas/mode/image-color-picker-mode';
import {
  type AdjustColorsControls as AdjustColorsControlsState,
  AdjustColorsWhiteBalanceMethod,
  gammaToPercent,
  percentToGamma,
} from '@/services/image/adjust-colors-controls';
import {useAppStore} from '@/stores/app-store';

const PERCENTILE_MIN = 80;
const PERCENTILE_MAX = 100;
const SATURATION_MIN = 80;
const SATURATION_MAX = 130;
const RGB_MIN = 0;
const RGB_MAX = 255;
const GAMMA_MIN = 0;
const GAMMA_MAX = 100;
const GAMMA_VALUES = [0.5, 1, 2];
const COLOR_TEMP_MIN = 1500;
const COLOR_TEMP_MAX = 12000;
const COLOR_TEMP_STEP = 50;
const COLOR_TEMP_VALUES = [1500, 3000, 6000, 9000, 12000];

const percentileSliderMarks: SliderMarks = Object.fromEntries(
  range(PERCENTILE_MIN, PERCENTILE_MAX, 5).map((i: number) => [i, i])
);

const saturationSliderMarks: SliderMarks = Object.fromEntries(
  range(SATURATION_MIN, SATURATION_MAX, 10).map((i: number) => [i, i])
);

const rgbSliderMarks: SliderMarks = Object.fromEntries([0, 127, 255].map((i: number) => [i, i]));

const gammaSliderMarks: SliderMarks = Object.fromEntries(
  GAMMA_VALUES.map(gamma => [gammaToPercent(gamma), gamma])
);

const colorTempSliderMarks: SliderMarks = Object.fromEntries(
  COLOR_TEMP_VALUES.map((i: number) => [i, i])
);

function levelsGradient(min: number, max: number): string {
  return `linear-gradient(to right, rgb(${min}, ${min}, ${min}) 0%, rgb(${max}, ${max}, ${max}) 100%)`;
}

function gammaGradient(inputLow: number, inputHigh: number, gamma: number, steps = 10): string {
  const stops = [];
  for (let i = 0; i <= steps; i++) {
    const input = inputLow + ((inputHigh - inputLow) * i) / steps;
    const normalized = (input - inputLow) / (inputHigh - inputLow);
    const corrected = Math.pow(normalized, 1 / gamma);
    const value = Math.round(corrected * 255);
    stops.push(`rgb(${value}, ${value}, ${value}) ${(i / steps) * 100}%`);
  }
  return `linear-gradient(to right, ${stops.join(', ')})`;
}

function kelvinGradient(minKelvin: number, maxKelvin: number, steps = 10): string {
  const stepSize = (maxKelvin - minKelvin) / steps;
  const stops = [];
  for (let i = 0; i <= steps; i++) {
    const kelvin = minKelvin + i * stepSize;
    const [r, g, b] = kelvinToRgb(kelvin);
    const percent = (i / steps) * 100;
    stops.push(`rgb(${r}, ${g}, ${b}) ${percent.toFixed(2)}%`);
  }
  return `linear-gradient(to right, ${stops.join(', ')})`;
}

interface Props {
  colorPickerMode: ImageColorPickerMode | null;
  onColorPickerEnabledChange: (enabled: boolean) => void;
}

export function AdjustColorsControls({
  colorPickerMode,
  onColorPickerEnabledChange,
}: Readonly<Props>) {
  const adjustColorsControls = useAppStore(state => state.adjustColorsControls);
  const setAdjustColorsControls = useAppStore(state => state.setAdjustColorsControls);
  const previewAdjustColors = useAppStore(state => state.previewAdjustColors);
  const updateAdjustColorsControls = useCallback(
    (controls: Partial<AdjustColorsControlsState>): void => {
      setAdjustColorsControls(controls);
    },
    [setAdjustColorsControls]
  );
  const applyAdjustColorsControls = useCallback(
    (controls: Partial<AdjustColorsControlsState>): void => {
      setAdjustColorsControls(controls);
      void previewAdjustColors();
    },
    [previewAdjustColors, setAdjustColorsControls]
  );
  const previewOnRelease = useCallback((): void => {
    void previewAdjustColors();
  }, [previewAdjustColors]);

  const {t} = useLingui();

  const {
    whiteBalanceMethod,
    percentile,
    whitePoint,
    saturation,
    inputLevels,
    gammaPercent,
    outputLevels,
    originalTemperature,
    targetTemperature,
  } = adjustColorsControls;

  const gamma = percentToGamma(gammaPercent);

  useEffect(() => {
    if (!colorPickerMode) {
      return;
    }
    const listener = ({rgb}: PipettePointSetEvent) => {
      applyAdjustColorsControls({whitePoint: rgbToHex(...rgb)});
    };
    colorPickerMode.events.subscribe(ImageColorPickerEventType.PipettePointSet, listener);
    return () => {
      colorPickerMode.events.unsubscribe(ImageColorPickerEventType.PipettePointSet, listener);
    };
  }, [colorPickerMode, applyAdjustColorsControls]);

  useEffect(() => {
    onColorPickerEnabledChange(whiteBalanceMethod === AdjustColorsWhiteBalanceMethod.WhitePoint);
    return () => {
      onColorPickerEnabledChange(false);
    };
  }, [whiteBalanceMethod, onColorPickerEnabledChange]);

  const modeOptions: CheckboxOptionType<number>[] = [
    {value: AdjustColorsWhiteBalanceMethod.Percentile, label: <Trans>Percentile</Trans>},
    {value: AdjustColorsWhiteBalanceMethod.WhitePoint, label: <Trans>Reference</Trans>},
    {value: AdjustColorsWhiteBalanceMethod.None, label: <Trans>Off</Trans>},
  ];

  return (
    <Space orientation="vertical" className="u-w-100">
      <Form.Item
        layout="vertical"
        label={<Trans>White balance</Trans>}
        tooltip={
          <Trans>
            Percentile: Auto white balance from brightest areas, good for most photos. Reference:
            Manual white balance using selected white area.
          </Trans>
        }
        className="u-mb-0"
      >
        <Radio.Group
          options={modeOptions}
          value={whiteBalanceMethod}
          onChange={(event: RadioChangeEvent) => {
            applyAdjustColorsControls({
              whiteBalanceMethod: event.target.value as AdjustColorsWhiteBalanceMethod,
            });
          }}
          optionType="button"
          buttonStyle="solid"
        />
      </Form.Item>

      {whiteBalanceMethod === AdjustColorsWhiteBalanceMethod.Percentile && (
        <Form.Item
          layout="vertical"
          label={<Trans>Percentile</Trans>}
          labelCol={{className: 'u-pb-0'}}
          tooltip={<Trans>Smaller percentile values correspond to stronger whitening</Trans>}
          className="u-mb-0"
        >
          <Slider
            value={percentile}
            onChange={value => {
              updateAdjustColorsControls({percentile: value});
            }}
            onChangeComplete={previewOnRelease}
            min={PERCENTILE_MIN}
            max={PERCENTILE_MAX}
            marks={percentileSliderMarks}
          />
        </Form.Item>
      )}

      {whiteBalanceMethod === AdjustColorsWhiteBalanceMethod.WhitePoint && (
        <>
          <Typography.Text>
            <Trans>Click 🖱️ or tap 👆 anywhere in the image to choose a white point.</Trans>
          </Typography.Text>
          <Form.Item
            label={<Trans>White point</Trans>}
            labelCol={{className: 'u-pb-0'}}
            tooltip={<Trans>Average color of the white point area</Trans>}
            className="u-mb-0"
          >
            <ColorPicker
              title={t`White point`}
              value={whitePoint}
              presets={[{label: <Trans>White</Trans>, colors: ['#fff']}]}
              onChangeComplete={(color: AggregationColor) => {
                applyAdjustColorsControls({whitePoint: color.toHexString()});
              }}
              showText
              disabledAlpha
            />
          </Form.Item>
        </>
      )}

      <Form.Item
        layout="vertical"
        label={<Trans>Saturation (%)</Trans>}
        labelCol={{className: 'u-pb-0'}}
        tooltip={
          <Trans>
            A value less than 100% makes the image look less colorful, and a value greater than 100%
            makes it look too colorful
          </Trans>
        }
        className="u-mb-0"
      >
        <Slider
          value={saturation}
          onChange={value => {
            updateAdjustColorsControls({saturation: value});
          }}
          onChangeComplete={previewOnRelease}
          min={SATURATION_MIN}
          max={SATURATION_MAX}
          marks={saturationSliderMarks}
        />
      </Form.Item>

      <Form.Item
        layout="vertical"
        label={<Trans>Shadows and highlights</Trans>}
        labelCol={{className: 'u-pb-0'}}
        tooltip={<Trans>Low input and high input</Trans>}
        className="u-mb-0"
      >
        <Slider
          range
          value={inputLevels}
          onChange={value => {
            updateAdjustColorsControls({inputLevels: value});
          }}
          onChangeComplete={previewOnRelease}
          min={RGB_MIN}
          max={RGB_MAX}
          marks={rgbSliderMarks}
          styles={{
            track: {background: 'transparent'},
            tracks: {background: gammaGradient(inputLevels[0]!, inputLevels[1]!, gamma)},
          }}
        />
      </Form.Item>

      <Form.Item
        layout="vertical"
        label={<Trans>Midtones</Trans>}
        labelCol={{className: 'u-pb-0'}}
        tooltip={<Trans>Gamma</Trans>}
        className="u-mb-0"
      >
        <Slider
          value={gammaPercent}
          onChange={value => {
            updateAdjustColorsControls({gammaPercent: value});
          }}
          onChangeComplete={previewOnRelease}
          min={GAMMA_MIN}
          max={GAMMA_MAX}
          marks={gammaSliderMarks}
          step={2}
          tooltip={{formatter: value => percentToGamma(value!).toFixed(2)}}
        />
      </Form.Item>

      <Form.Item
        layout="vertical"
        label={<Trans>Output levels</Trans>}
        labelCol={{className: 'u-pb-0'}}
        tooltip={<Trans>Low output and high output</Trans>}
        className="u-mb-0"
      >
        <Slider
          range
          value={outputLevels}
          onChange={value => {
            updateAdjustColorsControls({outputLevels: value});
          }}
          onChangeComplete={previewOnRelease}
          min={RGB_MIN}
          max={RGB_MAX}
          marks={rgbSliderMarks}
          styles={{
            track: {background: 'transparent'},
            tracks: {background: levelsGradient(outputLevels[0]!, outputLevels[1]!)},
          }}
        />
      </Form.Item>

      <Form.Item
        layout="vertical"
        label={<Trans>Original color temperature (K)</Trans>}
        labelCol={{className: 'u-pb-0'}}
        tooltip={
          <Trans>
            Estimated temperature of the light source in Kelvin the image was taken with
          </Trans>
        }
        className="u-mb-0"
      >
        <Slider
          value={originalTemperature}
          onChange={value => {
            updateAdjustColorsControls({originalTemperature: value});
          }}
          onChangeComplete={previewOnRelease}
          min={COLOR_TEMP_MIN}
          max={COLOR_TEMP_MAX}
          marks={colorTempSliderMarks}
          step={COLOR_TEMP_STEP}
          styles={{
            track: {background: 'transparent'},
            tracks: {background: 'transparent'},
            rail: {background: kelvinGradient(COLOR_TEMP_MIN, COLOR_TEMP_MAX)},
          }}
        />
      </Form.Item>

      <Form.Item
        layout="vertical"
        label={<Trans>Intended color temperature (K)</Trans>}
        labelCol={{className: 'u-pb-0'}}
        tooltip={
          <Trans>Corrected estimation of the temperature of the light source in Kelvin</Trans>
        }
        className="u-mb-0"
      >
        <Slider
          value={targetTemperature}
          onChange={value => {
            updateAdjustColorsControls({targetTemperature: value});
          }}
          onChangeComplete={previewOnRelease}
          min={COLOR_TEMP_MIN}
          max={COLOR_TEMP_MAX}
          marks={colorTempSliderMarks}
          step={COLOR_TEMP_STEP}
          styles={{
            track: {background: 'transparent'},
            tracks: {background: 'transparent'},
            rail: {background: kelvinGradient(COLOR_TEMP_MIN, COLOR_TEMP_MAX)},
          }}
        />
      </Form.Item>
    </Space>
  );
}
