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

import {DownloadOutlined, DownOutlined, PictureOutlined, ScissorOutlined} from '@ant-design/icons';
import {Trans, useLingui} from '@lingui/react/macro';
import type {CheckboxOptionType, RadioChangeEvent} from 'antd';
import {Button, Checkbox, Col, Dropdown, Form, Radio, Row, Slider, Space, Typography} from 'antd';
import type {CheckboxChangeEvent} from 'antd/es/checkbox';
import type {AggregationColor} from 'antd/es/color-picker/color';
import type {SliderMarks} from 'antd/es/slider';
import type {MenuProps} from 'antd/lib';
import {saveAs} from 'file-saver';
import {useCallback, useEffect, useMemo, useState} from 'react';

import {AdCard} from '@/components/ad/AdCard';
import {ColorPicker} from '@/components/color/ColorPicker';
import {FileSelect} from '@/components/file/FileSelect';
import {LoadingIndicator} from '@/components/loading/LoadingIndicator';
import {useDebounce} from '@/hooks/useDebounce';
import {useZoomableImageCanvas} from '@/hooks/useZoomableImageCanvas';
import type {PipettePointSetEvent} from '@/services/canvas/image/image-color-picker-canvas';
import {
  ColorPickerEventType,
  ImageColorPickerCanvas,
} from '@/services/canvas/image/image-color-picker-canvas';
import {kelvinToRgb} from '@/services/color/color-temperature';
import {rgbToHex, WHITE_HEX} from '@/services/color/space/rgb';
import type {AdjustmentParameters} from '@/services/image/color-adjustment';
import {blobToImageFile} from '@/services/image/image-file';
import {useAppStore} from '@/stores/app-store';
import {TabKey} from '@/tabs';
import {range} from '@/utils/array';
import {getFilename} from '@/utils/filename';
import {DrawImage, imageBitmapToBlob} from '@/utils/graphics';

import styles from './ImageColorAdjustment.module.css';

enum WhiteBalanceMethod {
  Percentile = 0,
  Reference = 1,
}

const FILENAME_SUFFIX = 'color-adjusted';

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

function gammaToPercent(gamma: number): number {
  return 50 * (Math.log(gamma) / Math.log(2) + 1);
}

function percentToGamma(percent: number): number {
  return Math.exp((percent / 50 - 1) * Math.log(2));
}

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

export function ImageColorAdjustment() {
  const imageFileToAdjustColors = useAppStore(state => state.imageFileToAdjustColors);
  const colorUnadjustedImage = useAppStore(state => state.colorUnadjustedImage);
  const colorAdjustedImage = useAppStore(state => state.colorAdjustedImage);

  const isColorAdjustedImageLoading = useAppStore(state => state.isColorAdjustedImageLoading);

  const setActiveTabKey = useAppStore(state => state.setActiveTabKey);
  const setImageFileToAdjustColors = useAppStore(state => state.setImageFileToAdjustColors);
  const setImageFileToRemoveBackground = useAppStore(state => state.setImageFileToRemoveBackground);
  const adjustImageColorsPercentile = useAppStore(state => state.adjustImageColorsPercentile);
  const adjustImageColorsReference = useAppStore(state => state.adjustImageColorsReference);
  const saveRecentImageFile = useAppStore(state => state.saveRecentImageFile);

  const {t} = useLingui();

  const [method, setMethod] = useState<WhiteBalanceMethod>(WhiteBalanceMethod.Percentile);
  const [percentile, setPercentile] = useState<number>(98);
  const [whitePoint, setWhitePoint] = useState<string>(WHITE_HEX);
  const [saturation, setSaturation] = useState<number>(100);
  const [inputLevels, setInputLevels] = useState<number[]>([0, 255]);
  const [gammaPercent, setGammaPercent] = useState<number>(50);
  const [outputLevels, setOutputLevels] = useState<number[]>([0, 255]);
  const [originalTemperature, setOriginalTemperature] = useState<number>(6500);
  const [targetTemperature, setTargetTemperature] = useState<number>(6500);
  const [isPreview, setIsPreview] = useState<boolean>(true);

  const images = useMemo<(ImageBitmap | null)[]>(
    () => [colorAdjustedImage, colorUnadjustedImage],
    [colorUnadjustedImage, colorAdjustedImage]
  );

  const imageColorPickerCanvasSupplier = useCallback(
    (canvas: HTMLCanvasElement): ImageColorPickerCanvas => {
      const colorPickerCanvas = new ImageColorPickerCanvas(canvas, {
        indicatorVisible: false,
        sampleRadius: 10,
        colorPickerImageIndex: 1,
      });
      const listener = ({rgb}: PipettePointSetEvent) => {
        setWhitePoint(rgbToHex(...rgb));
      };
      colorPickerCanvas.events.subscribe(ColorPickerEventType.PipettePointSet, listener);
      return colorPickerCanvas;
    },
    []
  );

  const {ref: canvasRef, zoomableImageCanvas: colorPickerCanvas} =
    useZoomableImageCanvas<ImageColorPickerCanvas>(imageColorPickerCanvasSupplier, images);

  const gamma = percentToGamma(gammaPercent);

  const percentileDebounced = useDebounce(percentile, 500);
  const saturationDebounced = useDebounce(saturation, 500);
  const inputLowHighDebounced = useDebounce(inputLevels, 500);
  const gammaDebounced = useDebounce(gamma, 500);
  const outputLowHighDebounced = useDebounce(outputLevels, 500);
  const origTempDebounced = useDebounce(originalTemperature, 500);
  const targetTempDebounced = useDebounce(targetTemperature, 500);

  useEffect(() => {
    if (colorUnadjustedImage) {
      const [inputLow, inputHigh] = inputLowHighDebounced;
      const [outputLow, outputHigh] = outputLowHighDebounced;
      const params: AdjustmentParameters = {
        saturation: saturationDebounced / 100,
        inputLow: inputLow! / 255,
        inputHigh: inputHigh! / 255,
        gamma: gammaDebounced,
        outputLow: outputLow! / 255,
        outputHigh: outputHigh! / 255,
        origTemperature: origTempDebounced,
        targetTemperature: targetTempDebounced,
      };
      const isReferenceMode = method === WhiteBalanceMethod.Reference;
      colorPickerCanvas?.setPipetteEnabled(isReferenceMode);
      if (isReferenceMode) {
        adjustImageColorsReference(whitePoint, params);
      } else {
        void adjustImageColorsPercentile(percentileDebounced / 100, params);
      }
    }
  }, [
    colorPickerCanvas,
    colorUnadjustedImage,
    adjustImageColorsPercentile,
    adjustImageColorsReference,
    method,
    whitePoint,
    percentileDebounced,
    saturationDebounced,
    inputLowHighDebounced,
    gammaDebounced,
    outputLowHighDebounced,
    origTempDebounced,
    targetTempDebounced,
  ]);

  const handleFileChange = ([file]: File[]) => {
    void setImageFileToAdjustColors(file ?? null);
  };

  const handlePreviewChange = ({target: {checked}}: CheckboxChangeEvent) => {
    setIsPreview(checked);
    colorPickerCanvas?.setImageIndex(checked ? 0 : 1);
  };

  const handleSaveClick = async (aspectRatio?: number) => {
    if (!colorAdjustedImage) {
      return;
    }
    const blob: Blob = await imageBitmapToBlob(colorAdjustedImage, {
      drawImage: DrawImage.expandToAspectRatio(aspectRatio),
    });
    saveAs(blob, getFilename(imageFileToAdjustColors, FILENAME_SUFFIX));
  };

  const handleSetAsReferenceClick = async () => {
    if (!colorAdjustedImage) {
      return;
    }
    const blob: Blob = await imageBitmapToBlob(colorAdjustedImage);
    void saveRecentImageFile(
      await blobToImageFile(blob, getFilename(imageFileToAdjustColors, FILENAME_SUFFIX))
    );
  };

  const handleRemoveBackgroundClick = async () => {
    if (!colorAdjustedImage) {
      return;
    }
    const blob: Blob = await imageBitmapToBlob(colorAdjustedImage);
    setImageFileToRemoveBackground(
      new File([blob], getFilename(imageFileToAdjustColors, FILENAME_SUFFIX) ?? '', {
        type: blob.type,
        lastModified: Date.now(),
      })
    );
    void setActiveTabKey(TabKey.BackgroundRemove);
  };

  const handleModeChange = (e: RadioChangeEvent) => {
    const value = e.target.value as WhiteBalanceMethod;
    setMethod(value);
  };

  const saveItems: MenuProps['items'] = [
    {
      key: 'save-4:5',
      label: t`Save expanded to 4:5`,
      icon: <DownloadOutlined />,
      onClick: () => {
        void handleSaveClick(4 / 5);
      },
    },
    {
      key: 'save-1.91:1',
      label: t`Save expanded to 1.91:1`,
      icon: <DownloadOutlined />,
      onClick: () => {
        void handleSaveClick(1.91 / 1);
      },
    },
  ];

  const modeOptions: CheckboxOptionType<number>[] = [
    {
      value: WhiteBalanceMethod.Percentile,
      label: t`Percentile`,
    },
    {
      value: WhiteBalanceMethod.Reference,
      label: t`Reference`,
    },
  ];

  return (
    <LoadingIndicator loading={isColorAdjustedImageLoading}>
      <Row>
        {colorUnadjustedImage && (
          <Col xs={24} sm={12} lg={16}>
            <canvas ref={canvasRef} className={styles['previewCanvas']} />
          </Col>
        )}
        <Col xs={24} sm={12} lg={8} className={styles['sidePanel']}>
          <Space orientation="vertical" className={styles['controls']}>
            <Typography.Text strong>
              <Trans>Select a photo to adjust white balance and colors</Trans>
            </Typography.Text>

            <Space>
              <FileSelect onChange={handleFileChange} showUseReferencePhoto showUseCopiedImage>
                <Trans>Select photo</Trans>
              </FileSelect>
              {colorAdjustedImage && (
                <Space.Compact>
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={() => {
                      void handleSaveClick();
                    }}
                  >
                    <Trans>Save</Trans>
                  </Button>
                  <Dropdown menu={{items: saveItems}} trigger={['click']}>
                    <Button icon={<DownOutlined />} />
                  </Dropdown>
                </Space.Compact>
              )}
            </Space>

            {colorAdjustedImage && (
              <>
                <Space>
                  <Button
                    size="small"
                    icon={<PictureOutlined />}
                    onClick={() => void handleSetAsReferenceClick()}
                  >
                    <Trans>Set as reference</Trans>
                  </Button>
                  <Button
                    size="small"
                    icon={<ScissorOutlined />}
                    onClick={() => void handleRemoveBackgroundClick()}
                  >
                    <Trans>Remove background</Trans>
                  </Button>
                </Space>

                <Form.Item label={t`Preview`} labelCol={{className: 'u-pb-0'}} className="u-mb-0">
                  <Checkbox checked={isPreview} onChange={handlePreviewChange} />
                </Form.Item>

                <Form.Item
                  label={t`White balance`}
                  labelCol={{className: 'u-pb-0'}}
                  tooltip={t`Percentile: Auto white balance from brightest areas, good for most photos. Reference: Manual white balance using selected white area.`}
                  className="u-mb-0"
                >
                  <Radio.Group
                    options={modeOptions}
                    value={method}
                    onChange={handleModeChange}
                    optionType="button"
                    buttonStyle="solid"
                  />
                </Form.Item>

                {method === WhiteBalanceMethod.Percentile && (
                  <Form.Item
                    layout="vertical"
                    label={t`Percentile`}
                    labelCol={{className: 'u-pb-0'}}
                    tooltip={`Smaller percentile values correspond to stronger whitening`}
                    className="u-mb-0"
                  >
                    <Slider
                      value={percentile}
                      onChange={(value: number) => {
                        setPercentile(value);
                      }}
                      min={PERCENTILE_MIN}
                      max={PERCENTILE_MAX}
                      marks={percentileSliderMarks}
                    />
                  </Form.Item>
                )}

                {method === WhiteBalanceMethod.Reference && (
                  <>
                    <Typography.Text>
                      <Trans>
                        Click 🖱️ or tap 👆 anywhere in the photo to choose a white point.
                      </Trans>
                    </Typography.Text>

                    <Form.Item
                      label={t`White point`}
                      labelCol={{className: 'u-pb-0'}}
                      tooltip={t`Average color of the white point area`}
                      className="u-mb-0"
                    >
                      <ColorPicker
                        title={t`White point`}
                        value={whitePoint}
                        presets={[
                          {
                            label: t`White`,
                            colors: ['#fff'],
                          },
                        ]}
                        onChangeComplete={(color: AggregationColor) => {
                          setWhitePoint(color.toHexString());
                        }}
                        showText
                        disabledAlpha
                      />
                    </Form.Item>
                  </>
                )}

                <Form.Item
                  layout="vertical"
                  label={t`Saturation (%)`}
                  labelCol={{className: 'u-pb-0'}}
                  tooltip={t`A value less than 100% makes the image look less colorful, and a value greater than 100% makes it look too colorful`}
                  className="u-mb-0"
                >
                  <Slider
                    value={saturation}
                    onChange={(value: number) => {
                      setSaturation(value);
                    }}
                    min={SATURATION_MIN}
                    max={SATURATION_MAX}
                    marks={saturationSliderMarks}
                  />
                </Form.Item>

                <Form.Item
                  layout="vertical"
                  label={t`Shadows and highlights`}
                  labelCol={{className: 'u-pb-0'}}
                  tooltip={t`Low input and high input`}
                  className="u-mb-0"
                >
                  <Slider
                    range
                    value={inputLevels}
                    onChange={(value: number[]) => {
                      setInputLevels(value);
                    }}
                    min={RGB_MIN}
                    max={RGB_MAX}
                    marks={rgbSliderMarks}
                    styles={{
                      track: {
                        background: 'transparent',
                      },
                      tracks: {
                        background: gammaGradient(inputLevels[0]!, inputLevels[1]!, gamma),
                      },
                    }}
                  />
                </Form.Item>

                <Form.Item
                  layout="vertical"
                  label={t`Midtones`}
                  labelCol={{className: 'u-pb-0'}}
                  tooltip={t`Gamma`}
                  className="u-mb-0"
                >
                  <Slider
                    value={gammaPercent}
                    onChange={(value: number) => {
                      setGammaPercent(value);
                    }}
                    min={GAMMA_MIN}
                    max={GAMMA_MAX}
                    marks={gammaSliderMarks}
                    step={2}
                    tooltip={{
                      formatter: value => percentToGamma(value!).toFixed(2),
                    }}
                  />
                </Form.Item>

                <Form.Item
                  layout="vertical"
                  label={t`Output levels`}
                  labelCol={{className: 'u-pb-0'}}
                  tooltip={t`Low output and high output`}
                  className="u-mb-0"
                >
                  <Slider
                    range
                    value={outputLevels}
                    onChange={(value: number[]) => {
                      setOutputLevels(value);
                    }}
                    min={RGB_MIN}
                    max={RGB_MAX}
                    marks={rgbSliderMarks}
                    styles={{
                      track: {
                        background: 'transparent',
                      },
                      tracks: {
                        background: levelsGradient(outputLevels[0]!, outputLevels[1]!),
                      },
                    }}
                  />
                </Form.Item>

                <Form.Item
                  layout="vertical"
                  label={t`Original color temperature (K)`}
                  labelCol={{className: 'u-pb-0'}}
                  tooltip={t`Estimated temperature of the light source in Kelvin the image was taken with`}
                  className="u-mb-0"
                >
                  <Slider
                    value={originalTemperature}
                    onChange={(value: number) => {
                      setOriginalTemperature(value);
                    }}
                    min={COLOR_TEMP_MIN}
                    max={COLOR_TEMP_MAX}
                    marks={colorTempSliderMarks}
                    step={COLOR_TEMP_STEP}
                    styles={{
                      track: {
                        background: 'transparent',
                      },
                      tracks: {
                        background: 'transparent',
                      },
                      rail: {
                        background: kelvinGradient(COLOR_TEMP_MIN, COLOR_TEMP_MAX),
                      },
                    }}
                  />
                </Form.Item>

                <Form.Item
                  layout="vertical"
                  label={t`Intended color temperature (K)`}
                  labelCol={{className: 'u-pb-0'}}
                  tooltip={t`Corrected estimation of the temperature of the light source in Kelvin`}
                  className="u-mb-0"
                >
                  <Slider
                    value={targetTemperature}
                    onChange={(value: number) => {
                      setTargetTemperature(value);
                    }}
                    min={COLOR_TEMP_MIN}
                    max={COLOR_TEMP_MAX}
                    marks={colorTempSliderMarks}
                    step={COLOR_TEMP_STEP}
                    styles={{
                      track: {
                        background: 'transparent',
                      },
                      tracks: {
                        background: 'transparent',
                      },
                      rail: {
                        background: kelvinGradient(COLOR_TEMP_MIN, COLOR_TEMP_MAX),
                      },
                    }}
                  />
                </Form.Item>
              </>
            )}
            <AdCard vertical />
          </Space>
        </Col>
      </Row>
    </LoadingIndicator>
  );
}
