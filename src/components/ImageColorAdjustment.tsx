/**
 * ArtistAssistApp
 * Copyright (C) 2023-2025  Eugene Khyst
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

import {
  DownloadOutlined,
  LoadingOutlined,
  MoreOutlined,
  PictureOutlined,
  ScissorOutlined,
} from '@ant-design/icons';
import {Trans, useLingui} from '@lingui/react/macro';
import {
  Button,
  Checkbox,
  Col,
  Dropdown,
  Form,
  Grid,
  Row,
  Slider,
  Space,
  Spin,
  Typography,
} from 'antd';
import type {CheckboxChangeEvent} from 'antd/es/checkbox';
import type {SliderMarks} from 'antd/es/slider';
import type {MenuProps} from 'antd/lib';
import {saveAs} from 'file-saver';
import type {ChangeEvent} from 'react';
import {useEffect, useMemo, useState} from 'react';

import {AdCard} from '~/src/components/ad/AdCard';
import {FileSelect} from '~/src/components/image/FileSelect';
import {useDebounce} from '~/src/hooks/useDebounce';
import {
  useZoomableImageCanvas,
  zoomableImageCanvasSupplier,
} from '~/src/hooks/useZoomableImageCanvas';
import type {ZoomableImageCanvas} from '~/src/services/canvas/image/zoomable-image-canvas';
import {kelvinToRgb} from '~/src/services/color/color-temperature';
import {blobToImageFile} from '~/src/services/image/image-file';
import {useAppStore} from '~/src/stores/app-store';
import {TabKey} from '~/src/tabs';
import {getFilename} from '~/src/utils/filename';
import {expandToAspectRatio, imageBitmapToBlob} from '~/src/utils/graphics';

const PERCENTILE_MIN = 80;
const PERCENTILE_MAX = 100;
const PERCENTILE_SLIDER_MARKS: SliderMarks = Object.fromEntries(
  [80, 85, 90, 95, 100].map((i: number) => [i, i])
);

const SATURATION_MIN = 80;
const SATURATION_MAX = 130;
const SATURATION_SLIDER_MARKS: SliderMarks = Object.fromEntries(
  [80, 90, 100, 110, 120, 130].map((i: number) => [i, i])
);

const RGB_MIN = 0;
const RGB_MAX = 255;
const RGB_SLIDER_MARKS: SliderMarks = Object.fromEntries([0, 127, 255].map((i: number) => [i, i]));

function gammaToPercent(gamma: number): number {
  return 50 * (Math.log(gamma) / Math.log(2) + 1);
}

function percentToGamma(percent: number): number {
  return Math.exp((percent / 50 - 1) * Math.log(2));
}

const GAMMA_VALUES = [0.5, 1, 2];
const GAMMA_MIN = 0;
const GAMMA_MAX = 100;
const GAMMA_SLIDER_MARKS: SliderMarks = Object.fromEntries(
  GAMMA_VALUES.map(gamma => [gammaToPercent(gamma), gamma])
);

const COLOR_TEMP_MIN = 1500;
const COLOR_TEMP_MAX = 12000;
const COLOR_TEMP_STEP = 50;
const COLOR_TEMP_SLIDER_MARKS: SliderMarks = Object.fromEntries(
  [1500, 3000, 6000, 9000, 12000].map((i: number) => [i, i])
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
    const {r, g, b} = kelvinToRgb(kelvin);
    const percent = (i / steps) * 100;
    stops.push(`rgb(${r}, ${g}, ${b}) ${percent.toFixed(2)}%`);
  }
  return `linear-gradient(to right, ${stops.join(', ')})`;
}

function getColorAdjustedImageFilename(file: File | null): string | undefined {
  return getFilename(file, 'color-adjusted');
}

export const ImageColorAdjustment: React.FC = () => {
  const imageFileToAdjustColors = useAppStore(state => state.imageFileToAdjustColors);
  const colorUnadjustedImage = useAppStore(state => state.colorUnadjustedImage);
  const colorAdjustedImage = useAppStore(state => state.colorAdjustedImage);

  const isColorAdjustedImageLoading = useAppStore(state => state.isColorAdjustedImageLoading);

  const setActiveTabKey = useAppStore(state => state.setActiveTabKey);
  const setImageFileToAdjustColors = useAppStore(state => state.setImageFileToAdjustColors);
  const setImageFileToRemoveBackground = useAppStore(state => state.setImageFileToRemoveBackground);
  const adjustImageColors = useAppStore(state => state.adjustImageColors);
  const saveRecentImageFile = useAppStore(state => state.saveRecentImageFile);

  const screens = Grid.useBreakpoint();

  const {t} = useLingui();

  const images = useMemo<(ImageBitmap | null)[]>(
    () => [colorAdjustedImage, colorUnadjustedImage],
    [colorUnadjustedImage, colorAdjustedImage]
  );

  const {ref: canvasRef, zoomableImageCanvas} = useZoomableImageCanvas<ZoomableImageCanvas>(
    zoomableImageCanvasSupplier,
    images
  );

  const [percentile, setPercentile] = useState<number>(98);
  const [saturation, setSaturation] = useState<number>(100);
  const [inputLevels, setInputLevels] = useState<number[]>([0, 255]);
  const [gammaPercent, setGammaPercent] = useState<number>(50);
  const [outputLevels, setOutputLevels] = useState<number[]>([0, 255]);
  const [originalTemperature, setOriginalTemperature] = useState<number>(6500);
  const [targetTemperature, setTargetTemperature] = useState<number>(6500);
  const [isPreview, setIsPreview] = useState<boolean>(true);

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
      void adjustImageColors(percentileDebounced / 100, {
        saturation: saturationDebounced / 100,
        inputLow: inputLow! / 255,
        inputHigh: inputHigh! / 255,
        gamma: gammaDebounced,
        outputLow: outputLow! / 255,
        outputHigh: outputHigh! / 255,
        origTemperature: origTempDebounced,
        targetTemperature: targetTempDebounced,
      });
    }
  }, [
    colorUnadjustedImage,
    adjustImageColors,
    percentileDebounced,
    saturationDebounced,
    inputLowHighDebounced,
    gammaDebounced,
    outputLowHighDebounced,
    origTempDebounced,
    targetTempDebounced,
  ]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file: File | null = e.target.files?.[0] ?? null;
    void setImageFileToAdjustColors(file);
  };

  const handlePreviewChange = ({target: {checked}}: CheckboxChangeEvent) => {
    setIsPreview(checked);
    zoomableImageCanvas?.setImageIndex(checked ? 0 : 1);
  };

  const handleSaveClick = async (aspectRatio?: number) => {
    if (!colorAdjustedImage) {
      return;
    }
    const blob: Blob = await imageBitmapToBlob(
      colorAdjustedImage,
      expandToAspectRatio(aspectRatio)
    );
    saveAs(blob, getColorAdjustedImageFilename(imageFileToAdjustColors));
  };

  const handleSetAsReferenceClick = async () => {
    if (!colorAdjustedImage) {
      return;
    }
    const blob: Blob = await imageBitmapToBlob(colorAdjustedImage);
    void saveRecentImageFile(
      await blobToImageFile(blob, getColorAdjustedImageFilename(imageFileToAdjustColors))
    );
  };

  const handleRemoveBackgroundClick = async () => {
    if (!colorAdjustedImage) {
      return;
    }
    const blob: Blob = await imageBitmapToBlob(colorAdjustedImage);
    setImageFileToRemoveBackground(
      new File([blob], getColorAdjustedImageFilename(imageFileToAdjustColors) ?? '', {
        type: blob.type,
        lastModified: Date.now(),
      })
    );
    void setActiveTabKey(TabKey.BackgroundRemove);
  };

  const saveItems: MenuProps['items'] = [
    {
      key: '1',
      label: t`Save expanded to 4:5`,
      icon: <DownloadOutlined />,
      onClick: () => {
        void handleSaveClick(4 / 5);
      },
    },
    {
      key: '2',
      label: t`Save expanded to 1.91:1`,
      icon: <DownloadOutlined />,
      onClick: () => {
        void handleSaveClick(1.91 / 1);
      },
    },
  ];

  const height = `calc((100dvh - 75px) / ${screens.sm ? '1' : '2 - 8px'})`;
  const margin = screens.sm ? 0 : 8;

  return (
    <Spin spinning={isColorAdjustedImageLoading} indicator={<LoadingOutlined spin />} size="large">
      <Row>
        {colorUnadjustedImage && (
          <Col xs={24} sm={12} lg={16}>
            <canvas
              ref={canvasRef}
              style={{
                width: '100%',
                height,
                marginBottom: margin,
              }}
            />
          </Col>
        )}
        <Col
          xs={24}
          sm={12}
          lg={8}
          style={{
            maxHeight: height,
            marginTop: margin,
            overflowY: 'auto',
          }}
        >
          <Space direction="vertical" style={{display: 'flex', padding: '0 16px 16px'}}>
            <Typography.Text strong>
              <Trans>Select a photo to adjust white balance and colors</Trans>
            </Typography.Text>

            <Space>
              <FileSelect onChange={handleFileChange}>
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
                  <Dropdown menu={{items: saveItems}}>
                    <Button icon={<MoreOutlined />} />
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

                <Form.Item label={t`Preview`} style={{marginBottom: 0}}>
                  <Checkbox checked={isPreview} onChange={handlePreviewChange} />
                </Form.Item>

                <Form.Item
                  layout="vertical"
                  label={t`White patch (%ile)`}
                  tooltip={`Smaller percentile values correspond to stronger whitening`}
                  style={{marginBottom: 0}}
                >
                  <Slider
                    value={percentile}
                    onChange={(value: number) => {
                      setPercentile(value);
                    }}
                    min={PERCENTILE_MIN}
                    max={PERCENTILE_MAX}
                    marks={PERCENTILE_SLIDER_MARKS}
                  />
                </Form.Item>

                <Form.Item
                  layout="vertical"
                  label={t`Saturation (%)`}
                  tooltip={t`A value less than 100% makes the image look less colorful, and a value greater than 100% makes it look too colorful`}
                  style={{marginBottom: 0}}
                >
                  <Slider
                    value={saturation}
                    onChange={(value: number) => {
                      setSaturation(value);
                    }}
                    min={SATURATION_MIN}
                    max={SATURATION_MAX}
                    marks={SATURATION_SLIDER_MARKS}
                  />
                </Form.Item>

                <Form.Item
                  layout="vertical"
                  label={t`Shadows and highlights`}
                  tooltip={t`Low input and high input`}
                  style={{marginBottom: 0}}
                >
                  <Slider
                    range
                    value={inputLevels}
                    onChange={(value: number[]) => {
                      setInputLevels(value);
                    }}
                    min={RGB_MIN}
                    max={RGB_MAX}
                    marks={RGB_SLIDER_MARKS}
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
                  tooltip={t`Gamma`}
                  style={{marginBottom: 0}}
                >
                  <Slider
                    value={gammaPercent}
                    onChange={(value: number) => {
                      setGammaPercent(value);
                    }}
                    min={GAMMA_MIN}
                    max={GAMMA_MAX}
                    marks={GAMMA_SLIDER_MARKS}
                    step={2}
                    tooltip={{
                      formatter: value => percentToGamma(value!).toFixed(2),
                    }}
                  />
                </Form.Item>

                <Form.Item
                  layout="vertical"
                  label={t`Output levels`}
                  tooltip={t`Low output and high output`}
                  style={{marginBottom: 0}}
                >
                  <Slider
                    range
                    value={outputLevels}
                    onChange={(value: number[]) => {
                      setOutputLevels(value);
                    }}
                    min={RGB_MIN}
                    max={RGB_MAX}
                    marks={RGB_SLIDER_MARKS}
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
                  tooltip={t`Estimated temperature of the light source in Kelvin the image was taken with`}
                  style={{marginBottom: 0}}
                >
                  <Slider
                    value={originalTemperature}
                    onChange={(value: number) => {
                      setOriginalTemperature(value);
                    }}
                    min={COLOR_TEMP_MIN}
                    max={COLOR_TEMP_MAX}
                    marks={COLOR_TEMP_SLIDER_MARKS}
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
                  tooltip={t`Corrected estimation of the temperature of the light source in Kelvin`}
                  style={{marginBottom: 0}}
                >
                  <Slider
                    value={targetTemperature}
                    onChange={(value: number) => {
                      setTargetTemperature(value);
                    }}
                    min={COLOR_TEMP_MIN}
                    max={COLOR_TEMP_MAX}
                    marks={COLOR_TEMP_SLIDER_MARKS}
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
    </Spin>
  );
};
