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

import {BgColorsOutlined, LoadingOutlined} from '@ant-design/icons';
import {Trans, useLingui} from '@lingui/react/macro';
import {
  Button,
  Col,
  ColorPicker,
  Form,
  Grid,
  Row,
  Select,
  Slider,
  Space,
  Spin,
  Typography,
} from 'antd';
import type {Color} from 'antd/es/color-picker';
import type {DefaultOptionType as SelectOptionType} from 'antd/es/select';
import type {SliderMarks} from 'antd/es/slider';
import {useCallback, useEffect, useState} from 'react';

import {AdCard} from '~/src/components/ad/AdCard';
import {PaletteColorMixtureCard} from '~/src/components/color/PaletteColorMixtureCard';
import {ReflectanceChartDrawer} from '~/src/components/color/ReflectanceChartDrawer';
import {useZoomableImageCanvas} from '~/src/hooks/useZoomableImageCanvas';
import type {
  ColorPickerSample,
  PipettePointSetEvent,
} from '~/src/services/canvas/image/image-color-picker-canvas';
import {
  ColorPickerEventType,
  ImageColorPickerCanvas,
  MIN_COLOR_PICKER_DIAMETER,
} from '~/src/services/canvas/image/image-color-picker-canvas';
import {
  COLOR_MIXING,
  compareSimilarColorsByColorMixturePartLength,
  compareSimilarColorsByConsistency,
  compareSimilarColorsBySimilarity,
  PAPER_WHITE_HEX,
} from '~/src/services/color/color-mixer';
import type {ColorMixture, SimilarColor} from '~/src/services/color/types';
import {saveAppSettings} from '~/src/services/db/app-settings-db';
import {Vector} from '~/src/services/math/geometry';
import {ColorPickerSort} from '~/src/services/settings/types';
import {useAppStore} from '~/src/stores/app-store';
import type {Comparator} from '~/src/utils/array';

import {SimilarColorCard} from './color/SimilarColorCard';
import {EmptyColorSet} from './empty/EmptyColorSet';

const SAMPLE_DIAMETER_SLIDER_MARKS: SliderMarks = Object.fromEntries(
  [1, 10, 20, 30, 40, 50].map((i: number) => [i, i])
);

const SIMILAR_COLORS_COMPARATORS: Record<ColorPickerSort, Comparator<SimilarColor>> = {
  [ColorPickerSort.BySimilarity]: compareSimilarColorsBySimilarity,
  [ColorPickerSort.ByNumberOfColors]: compareSimilarColorsByColorMixturePartLength,
  [ColorPickerSort.ByConsistency]: compareSimilarColorsByConsistency,
};

export const ImageColorPicker: React.FC = () => {
  const appSettings = useAppStore(state => state.appSettings);
  const colorSet = useAppStore(state => state.colorSet);
  const originalImage = useAppStore(state => state.originalImage);
  const backgroundColor = useAppStore(state => state.backgroundColor);
  const targetColor = useAppStore(state => state.targetColor);
  const colorPickerPipette = useAppStore(state => state.colorPickerPipette);
  const similarColors = useAppStore(state => state.similarColors);
  const paletteColorMixtures = useAppStore(state => state.paletteColorMixtures);
  const selectedPaletteColorMixtures = useAppStore(state => state.selectedPaletteColorMixtures);

  const isColorMixerSetLoading = useAppStore(state => state.isColorMixerSetLoading);
  const isColorMixerBackgroundLoading = useAppStore(state => state.isColorMixerBackgroundLoading);
  const isOriginalImageLoading = useAppStore(state => state.isOriginalImageLoading);
  const isSimilarColorsLoading = useAppStore(state => state.isSimilarColorsLoading);

  const setTargetColor = useAppStore(state => state.setTargetColor);
  const setBackgroundColor = useAppStore(state => state.setBackgroundColor);
  const selectPaletteColorMixtures = useAppStore(state => state.selectPaletteColorMixtures);

  const screens = Grid.useBreakpoint();

  const {t} = useLingui();

  const imageColorPickerCanvasSupplier = useCallback(
    (canvas: HTMLCanvasElement): ImageColorPickerCanvas => {
      const colorPickerCanvas = new ImageColorPickerCanvas(canvas);
      const listener = ({rgb, point: {x, y}, diameter}: PipettePointSetEvent) => {
        const hex = rgb.toHex();
        console.log(hex.toUpperCase());
        void setTargetColor(hex, {x, y, diameter});
        selectPaletteColorMixtures(colorPickerCanvas.getSamplesNearby(x, y).map(({key}) => key));
      };
      colorPickerCanvas.events.subscribe(ColorPickerEventType.PipettePointSet, listener);
      return colorPickerCanvas;
    },
    [setTargetColor, selectPaletteColorMixtures]
  );

  const {ref: canvasRef, zoomableImageCanvas: colorPickerCanvas} =
    useZoomableImageCanvas<ImageColorPickerCanvas>(imageColorPickerCanvasSupplier, originalImage);

  const [sampleDiameter, setSampleDiameter] = useState<number>(10);
  const [sort, setSort] = useState<ColorPickerSort>(ColorPickerSort.BySimilarity);
  const [reflectanceChartColorMixture, setReflectanceChartColorMixture] = useState<ColorMixture>();
  const [isOpenReflectanceChart, setIsOpenReflectanceChart] = useState<boolean>(false);

  const isLoading: boolean =
    isColorMixerSetLoading ||
    isColorMixerBackgroundLoading ||
    isOriginalImageLoading ||
    isSimilarColorsLoading;

  useEffect(() => {
    const {colorPickerDiameter, colorPickerSort} = appSettings;
    if (colorPickerDiameter) {
      setSampleDiameter(colorPickerDiameter);
    }
    if (colorPickerSort) {
      setSort(colorPickerSort);
    }
  }, [appSettings]);

  useEffect(() => {
    colorPickerCanvas?.setPipetteDiameter(sampleDiameter);
  }, [colorPickerCanvas, sampleDiameter]);

  useEffect(() => {
    if (!colorPickerCanvas || !colorPickerPipette) {
      return;
    }
    const {x, y, diameter} = colorPickerPipette;
    colorPickerCanvas.setPipetteDiameter(diameter);
    colorPickerCanvas.setPipettePoint(new Vector(x, y));
    colorPickerCanvas.setMinZoom();
    setSampleDiameter(diameter);
  }, [colorPickerCanvas, colorPickerPipette]);

  useEffect(() => {
    colorPickerCanvas?.setSamples(
      [...paletteColorMixtures.values()].flatMap(
        ({key, samplingArea, layerRgb}): ColorPickerSample | ColorPickerSample[] =>
          samplingArea
            ? {
                key,
                x: samplingArea.x,
                y: samplingArea.y,
                rgb: layerRgb,
              }
            : []
      )
    );
  }, [colorPickerCanvas, paletteColorMixtures]);

  const handleReflectanceChartClick = useCallback((colorMixture?: ColorMixture) => {
    setReflectanceChartColorMixture(colorMixture);
    setIsOpenReflectanceChart(true);
  }, []);

  const handleSampleDiameterChange = (colorPickerDiameter: number) => {
    setSampleDiameter(colorPickerDiameter);
    void saveAppSettings({colorPickerDiameter});
  };

  const handleSortChange = (colorPickerSort: ColorPickerSort) => {
    setSort(colorPickerSort);
    void saveAppSettings({colorPickerSort});
  };

  const handleTargetColorChange = (color: string) => {
    colorPickerCanvas?.setPipettePoint(null);
    void setTargetColor(color, null);
  };

  if (!colorSet) {
    return <EmptyColorSet imageSupported={true} />;
  }

  const sortOptions: SelectOptionType[] = [
    {value: ColorPickerSort.BySimilarity, label: t`Similarity`},
    {value: ColorPickerSort.ByNumberOfColors, label: t`Color count`},
    {value: ColorPickerSort.ByConsistency, label: t`Thickness`},
  ];

  const {mixing, glazing} = COLOR_MIXING[colorSet.type];

  const height = `calc((100dvh - 75px) / ${screens.sm ? '1' : '2 - 8px'})`;
  const margin = screens.sm ? 0 : 8;

  return (
    <>
      <Spin spinning={isLoading} indicator={<LoadingOutlined spin />} size="large">
        <Row>
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
          <Col
            xs={24}
            sm={12}
            lg={8}
            style={{
              marginTop: margin,
              width: '100%',
              maxHeight: height,
              overflowY: 'auto',
            }}
          >
            <Space
              direction="vertical"
              style={{padding: '0 16px 16px', width: '100%', boxSizing: 'border-box'}}
            >
              <Space direction="vertical" size={0}>
                {glazing && (
                  <Space align="start" wrap style={{display: 'flex'}}>
                    <Form.Item
                      label={t`Background`}
                      tooltip={t`The color of paper or canvas, or the color of the base layer when glazed.`}
                      style={{marginBottom: 0}}
                    >
                      <ColorPicker
                        value={backgroundColor}
                        presets={[
                          {
                            label: t`Paper white`,
                            colors: [PAPER_WHITE_HEX],
                          },
                        ]}
                        onChangeComplete={(color: Color) => {
                          void setBackgroundColor(color.toHexString());
                        }}
                        showText
                        disabledAlpha
                      />
                    </Form.Item>
                    <Form.Item style={{marginBottom: 0}}>
                      <Button
                        icon={<BgColorsOutlined />}
                        title={t`Set paper white background`}
                        onClick={() => {
                          void setBackgroundColor(PAPER_WHITE_HEX);
                        }}
                      >
                        <Trans>White</Trans>
                      </Button>
                    </Form.Item>
                  </Space>
                )}
                <Form.Item
                  label={t`Diameter`}
                  tooltip={t`The diameter of the circular area around the cursor, used to calculate the average color of the pixels in that area.`}
                  style={{marginBottom: 0}}
                >
                  <Slider
                    value={sampleDiameter}
                    onChange={handleSampleDiameterChange}
                    min={MIN_COLOR_PICKER_DIAMETER}
                    max={50}
                    marks={SAMPLE_DIAMETER_SLIDER_MARKS}
                  />
                </Form.Item>
                <Space align="center" wrap style={{display: 'flex'}}>
                  <Form.Item
                    label={t`Color`}
                    tooltip={t`The color to be mixed from your color set. Select a color by clicking a point on the image, or use the color picker popup.`}
                    style={{marginBottom: 0}}
                  >
                    <ColorPicker
                      value={targetColor}
                      onChangeComplete={(color: Color) => {
                        handleTargetColorChange(color.toHexString());
                      }}
                      showText
                      disabledAlpha
                    />
                  </Form.Item>
                  {mixing && (
                    <Form.Item
                      label={t`Sort`}
                      tooltip={t`Sort by the similarity of the mixture to the target color, or by the number of colors in the mixture, or by the thickness of the mixture.`}
                      style={{marginBottom: 0}}
                    >
                      <Select
                        value={sort}
                        onChange={handleSortChange}
                        options={sortOptions}
                        popupMatchSelectWidth={false}
                      />
                    </Form.Item>
                  )}
                </Space>
                {screens.sm && colorSet.name && (
                  <Form.Item label={t`Color set`} style={{marginBottom: 0}}>
                    {colorSet.name}
                  </Form.Item>
                )}
              </Space>
              {!isSimilarColorsLoading && !similarColors.length ? (
                <Space direction="vertical" style={{margin: '8px 0'}}>
                  <Typography.Text strong>
                    ⁉️ <Trans>No data</Trans>
                  </Typography.Text>
                  <Typography.Text>
                    <Trans>
                      Click 🖱️ or tap 👆 anywhere in the photo, or use the color picker pop-up to
                      choose a target color to mix from your colors.
                    </Trans>
                  </Typography.Text>
                  <Typography.Text>
                    🔎 <Trans>Pinch to zoom (or use the mouse wheel) and drag to pan</Trans>
                  </Typography.Text>
                </Space>
              ) : (
                <>
                  {[...selectedPaletteColorMixtures.values()].map(colorMixture => (
                    <PaletteColorMixtureCard
                      key={`selected-${colorMixture.key}`}
                      colorMixture={colorMixture}
                      showOnPhoto={false}
                      style={{borderColor: 'black'}}
                    />
                  ))}
                  {similarColors
                    .slice()
                    .sort(SIMILAR_COLORS_COMPARATORS[sort])
                    .map((similarColor: SimilarColor) => (
                      <SimilarColorCard
                        key={similarColor.colorMixture.key}
                        targetColor={targetColor}
                        similarColor={similarColor}
                        onReflectanceChartClick={handleReflectanceChartClick}
                      />
                    ))}
                </>
              )}
              <AdCard vertical />
            </Space>
          </Col>
        </Row>
      </Spin>
      <ReflectanceChartDrawer
        colorMixture={reflectanceChartColorMixture}
        targetColor={targetColor}
        open={isOpenReflectanceChart}
        onClose={() => {
          setIsOpenReflectanceChart(false);
        }}
      />
    </>
  );
};
