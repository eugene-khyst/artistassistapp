/**
 * ArtistAssistApp
 * Copyright (C) 2023-2024  Eugene Khyst
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
import {ReflectanceChartDrawer} from '~/src/components/color/ReflectanceChartDrawer';
import {useZoomableImageCanvas} from '~/src/hooks';
import type {PipetPointSetEvent} from '~/src/services/canvas/image';
import {
  ColorPickerEventType,
  ImageColorPickerCanvas,
  MIN_COLOR_PICKER_DIAMETER,
} from '~/src/services/canvas/image';
import type {ColorMixture, SamplingArea, SimilarColor} from '~/src/services/color';
import {
  COLOR_MIXING,
  compareSimilarColorsByColorMixturePartLength,
  compareSimilarColorsByConsistency,
  compareSimilarColorsBySimilarity,
  PAPER_WHITE_HEX,
} from '~/src/services/color';
import {getAppSettings, saveAppSettings} from '~/src/services/db';
import {Vector} from '~/src/services/math';
import {ColorPickerSort} from '~/src/services/settings';
import {useAppStore} from '~/src/stores/app-store';

import {SimilarColorCard} from './color/SimilarColorCard';
import {EmptyColorSet} from './empty/EmptyColorSet';

const DEFAULT_SAMPLE_DIAMETER = 10;
const MAX_SAMPLE_DIAMETER = 50;
const SAMPLE_DIAMETER_SLIDER_MARKS: SliderMarks = Object.fromEntries(
  [1, 10, 20, 30, 40, 50].map((i: number) => [i, i])
);

const SIMILAR_COLORS_COMPARATORS: Record<
  ColorPickerSort,
  (a: SimilarColor, b: SimilarColor) => number
> = {
  [ColorPickerSort.BySimilarity]: compareSimilarColorsBySimilarity,
  [ColorPickerSort.ByNumberOfColors]: compareSimilarColorsByColorMixturePartLength,
  [ColorPickerSort.ByConsistency]: compareSimilarColorsByConsistency,
};

const SORT_OPTIONS: SelectOptionType[] = [
  {value: ColorPickerSort.BySimilarity, label: 'Similarity'},
  {value: ColorPickerSort.ByNumberOfColors, label: 'Color count'},
  {value: ColorPickerSort.ByConsistency, label: 'Thickness'},
];

function getSamplingArea(colorPickerCanvas?: ImageColorPickerCanvas): SamplingArea | null {
  const pipetPoint = colorPickerCanvas?.getPipetPoint();
  const diameter = colorPickerCanvas?.getLastPipetDiameter();
  if (pipetPoint && diameter) {
    const {x, y} = pipetPoint;
    return {x, y, diameter};
  }
  return null;
}

export const ImageColorPicker: React.FC = () => {
  const colorSet = useAppStore(state => state.colorSet);
  const originalImage = useAppStore(state => state.originalImage);
  const backgroundColor = useAppStore(state => state.backgroundColor);
  const targetColor = useAppStore(state => state.targetColor);
  const colorPickerPipet = useAppStore(state => state.colorPickerPipet);
  const similarColors = useAppStore(state => state.similarColors);

  const isColorMixerSetLoading = useAppStore(state => state.isColorMixerSetLoading);
  const isColorMixerBackgroundLoading = useAppStore(state => state.isColorMixerBackgroundLoading);
  const isOriginalImageLoading = useAppStore(state => state.isOriginalImageLoading);
  const isSimilarColorsLoading = useAppStore(state => state.isSimilarColorsLoading);

  const setTargetColor = useAppStore(state => state.setTargetColor);
  const setBackgroundColor = useAppStore(state => state.setBackgroundColor);

  const screens = Grid.useBreakpoint();

  const imageColorPickerCanvasSupplier = useCallback(
    (canvas: HTMLCanvasElement): ImageColorPickerCanvas => {
      const colorPickerCanvas = new ImageColorPickerCanvas(canvas);
      const listener = ({rgb}: PipetPointSetEvent) => {
        const hex = rgb.toHex();
        void setTargetColor(hex, getSamplingArea(colorPickerCanvas));
        console.log(hex.toUpperCase());
      };
      colorPickerCanvas.events.subscribe(ColorPickerEventType.PipetPointSet, listener);
      return colorPickerCanvas;
    },
    [setTargetColor]
  );

  const {ref: canvasRef, zoomableImageCanvas: colorPickerCanvas} =
    useZoomableImageCanvas<ImageColorPickerCanvas>(imageColorPickerCanvasSupplier, originalImage);

  const [sampleDiameter, setSampleDiameter] = useState<number>(DEFAULT_SAMPLE_DIAMETER);
  const [sort, setSort] = useState<ColorPickerSort>(ColorPickerSort.BySimilarity);
  const [reflectanceChartColorMixture, setReflectanceChartColorMixture] = useState<ColorMixture>();
  const [isOpenReflectanceChart, setIsOpenReflectanceChart] = useState<boolean>(false);

  const isLoading: boolean =
    isColorMixerSetLoading ||
    isColorMixerBackgroundLoading ||
    isOriginalImageLoading ||
    isSimilarColorsLoading;

  useEffect(() => {
    void (async () => {
      const {colorPickerDiameter, colorPickerSort} = (await getAppSettings()) ?? {};
      if (colorPickerDiameter) {
        setSampleDiameter(colorPickerDiameter);
      }
      if (colorPickerSort) {
        setSort(colorPickerSort);
      }
    })();
  }, []);

  useEffect(() => {
    colorPickerCanvas?.setPipetDiameter(sampleDiameter);
  }, [colorPickerCanvas, sampleDiameter]);

  useEffect(() => {
    if (!colorPickerCanvas || !colorPickerPipet) {
      return;
    }
    const {x, y, diameter} = colorPickerPipet;
    colorPickerCanvas.setPipetDiameter(diameter);
    colorPickerCanvas.setPipetPoint(new Vector(x, y));
    colorPickerCanvas.setMinZoom();
    setSampleDiameter(diameter);
  }, [colorPickerCanvas, colorPickerPipet]);

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
    colorPickerCanvas?.setPipetPoint(null);
    void setTargetColor(color, null);
  };

  if (!colorSet) {
    return <EmptyColorSet feature="color picker" imageSupported={true} />;
  }

  const {glazing = true} = COLOR_MIXING[colorSet.type];

  const height = `calc((100vh - 75px) / ${screens.sm ? '1' : '2 - 8px'})`;
  const margin = screens.sm ? 0 : 8;

  return (
    <>
      <Spin spinning={isLoading} tip="Loading" indicator={<LoadingOutlined spin />} size="large">
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
              maxHeight: height,
              marginTop: margin,
              overflowY: 'auto',
            }}
          >
            <Space direction="vertical" style={{padding: '0 16px 16px'}}>
              <Space align="start" wrap style={{display: 'flex'}}>
                <Form.Item
                  label="Background"
                  tooltip="The color of paper or canvas, or the color of the base layer when glazed."
                  style={{marginBottom: 0}}
                >
                  <ColorPicker
                    value={glazing ? backgroundColor : PAPER_WHITE_HEX}
                    presets={[
                      {
                        label: 'Paper white',
                        colors: [PAPER_WHITE_HEX],
                      },
                    ]}
                    onChangeComplete={(color: Color) => {
                      void setBackgroundColor(color.toHexString());
                    }}
                    showText
                    disabledAlpha
                    disabled={!glazing}
                  />
                </Form.Item>
                <Form.Item style={{marginBottom: 0}}>
                  <Button
                    icon={<BgColorsOutlined />}
                    title="Set paper white background"
                    onClick={() => {
                      void setBackgroundColor(PAPER_WHITE_HEX);
                    }}
                    disabled={!glazing}
                  >
                    White
                  </Button>
                </Form.Item>
              </Space>
              <Form.Item
                label="Diameter"
                tooltip="The diameter of the circular area around the cursor, used to calculate the average color of the pixels within the area."
                style={{flexGrow: 1, marginBottom: 0}}
              >
                <Slider
                  value={sampleDiameter}
                  onChange={handleSampleDiameterChange}
                  min={MIN_COLOR_PICKER_DIAMETER}
                  max={MAX_SAMPLE_DIAMETER}
                  marks={SAMPLE_DIAMETER_SLIDER_MARKS}
                />
              </Form.Item>
              <Space align="center" wrap style={{display: 'flex'}}>
                <Form.Item
                  label="Color"
                  tooltip="The color to be mixed from your color set. Select a color by clicking a point on the image, or use the color picker popup."
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
                <Form.Item
                  label="Sort"
                  tooltip="Sort by similarity of the mix to the target color or by the number of colors in the mix."
                  style={{marginBottom: 0}}
                >
                  <Select
                    value={sort}
                    onChange={handleSortChange}
                    options={SORT_OPTIONS}
                    style={{width: 115}}
                  />
                </Form.Item>
              </Space>
              {!isSimilarColorsLoading && !similarColors.length ? (
                <Space direction="vertical" style={{margin: '8px 0'}}>
                  <Typography.Text strong>⁉️ No data</Typography.Text>
                  <Typography.Text>
                    Click 🖱️ or tap 👆 anywhere in the photo, or use the color picker pop-up to
                    choose a target color to mix from your colors.
                  </Typography.Text>
                  <Typography.Text>
                    🔎 Pinch to zoom (or use the mouse wheel) and drag to pan
                  </Typography.Text>
                </Space>
              ) : (
                similarColors
                  .slice()
                  .sort(SIMILAR_COLORS_COMPARATORS[sort])
                  .map((similarColor: SimilarColor) => (
                    <SimilarColorCard
                      key={similarColor.colorMixture.key}
                      similarColor={similarColor}
                      onReflectanceChartClick={handleReflectanceChartClick}
                    />
                  ))
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
