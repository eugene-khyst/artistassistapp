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

import {DownOutlined, MoreOutlined, SortAscendingOutlined} from '@ant-design/icons';
import {Plural, Trans, useLingui} from '@lingui/react/macro';
import {
  Button,
  Col,
  ColorPicker,
  Dropdown,
  Form,
  Grid,
  Row,
  Slider,
  Space,
  theme,
  Typography,
} from 'antd';
import type {AggregationColor} from 'antd/es/color-picker/color';
import type {SliderMarks} from 'antd/es/slider';
import type {MenuProps} from 'antd/lib';
import {useCallback, useEffect, useMemo, useState} from 'react';

import {AdCard} from '~/src/components/ad/AdCard';
import {PaletteColorMixtureCard} from '~/src/components/color/PaletteColorMixtureCard';
import {ReflectanceChartDrawer} from '~/src/components/color/ReflectanceChartDrawer';
import {ColorSetName} from '~/src/components/color-set/ColorSetName';
import {LoadingIndicator} from '~/src/components/loading/LoadingIndicator';
import {COLOR_PICKER_PRESET_LABELS} from '~/src/components/messages';
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
  isPastel,
  PAPER_WHITE_HEX,
} from '~/src/services/color/color-mixer';
import {colorSetToBrandColorCounts} from '~/src/services/color/colors';
import {hexToRgb, rgbToHex} from '~/src/services/color/space/rgb';
import {type ColorMixture, type SimilarColor} from '~/src/services/color/types';
import {Vector} from '~/src/services/math/geometry';
import {ColorPickerSort} from '~/src/services/settings/types';
import {useAppStore} from '~/src/stores/app-store';
import type {Comparator} from '~/src/utils/comparator';

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

const PastelInfo: React.FC = () => {
  const {
    token: {fontSize, colorText, lineHeight},
  } = theme.useToken();

  return (
    <div
      style={{
        width: 234,
        fontSize,
        color: colorText,
        lineHeight,
        marginBottom: 8,
      }}
    >
      <Trans>
        Paper color doesn&apos;t matter for opaque pastels, as they completely cover the surface.
      </Trans>
    </div>
  );
};

export const ImageColorPicker: React.FC = () => {
  const colorPickerDiameter = useAppStore(state => state.appSettings.colorPickerDiameter);
  const colorPickerSort = useAppStore(state => state.appSettings.colorPickerSort);
  const colorSet = useAppStore(state => state.colorSet);
  const imageFile = useAppStore(state => state.imageFile);
  const originalImage = useAppStore(state => state.originalImage);
  const colorMatchImage = useAppStore(state => state.colorMatchImage);
  const backgroundColor = useAppStore(state => state.backgroundColor);
  const targetColor = useAppStore(state => state.targetColor);
  const colorPickerPipette = useAppStore(state => state.colorPickerPipette);
  const similarColors = useAppStore(state => state.similarColors);
  const paletteColorMixtures = useAppStore(state => state.paletteColorMixtures);
  const selectedPaletteColorMixtures = useAppStore(state => state.selectedPaletteColorMixtures);

  const isColorMixerSetLoading = useAppStore(state => state.isColorMixerSetLoading);
  const isColorMixerBackgroundLoading = useAppStore(state => state.isColorMixerBackgroundLoading);
  const isOriginalImageLoading = useAppStore(state => state.isOriginalImageLoading);
  const isSampleImageLoading = useAppStore(state => state.isSampleImageLoading);
  const isPosterizedImageLoading = useAppStore(state => state.isPosterizedImageLoading);
  const isBuildPaletteLoading = useAppStore(state => state.isBuildPaletteLoading);
  const isColorMatchImageLoading = useAppStore(state => state.isColorMatchImageLoading);
  const isSimilarColorsLoading = useAppStore(state => state.isSimilarColorsLoading);

  const setTargetColor = useAppStore(state => state.setTargetColor);
  const setBackgroundColor = useAppStore(state => state.setBackgroundColor);
  const setColorMatchImage = useAppStore(state => state.setColorMatchImage);
  const posterizeImage = useAppStore(state => state.posterizeImage);
  const buildPalette = useAppStore(state => state.buildPalette);
  const selectPaletteColorMixtures = useAppStore(state => state.selectPaletteColorMixtures);
  const saveAppSettings = useAppStore(state => state.saveAppSettings);
  const abortPosterizeImage = useAppStore(state => state.abortPosterizeImage);
  const abortBuildPalette = useAppStore(state => state.abortBuildPalette);

  const screens = Grid.useBreakpoint();

  const {t} = useLingui();

  const imageColorPickerCanvasSupplier = useCallback(
    (canvas: HTMLCanvasElement): ImageColorPickerCanvas => {
      const colorPickerCanvas = new ImageColorPickerCanvas(canvas);
      const listener = ({rgb, point: {x, y}, diameter}: PipettePointSetEvent) => {
        void setTargetColor(rgbToHex(...rgb), {x, y, diameter});
        selectPaletteColorMixtures(colorPickerCanvas.getSamplesNearby(x, y).map(({key}) => key));
        void setColorMatchImage(null);
      };
      colorPickerCanvas.events.subscribe(ColorPickerEventType.PipettePointSet, listener);
      return colorPickerCanvas;
    },
    [setTargetColor, selectPaletteColorMixtures, setColorMatchImage]
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
    isSampleImageLoading ||
    isPosterizedImageLoading ||
    isBuildPaletteLoading ||
    isColorMatchImageLoading ||
    isSimilarColorsLoading;

  useEffect(() => {
    if (colorPickerDiameter) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSampleDiameter(colorPickerDiameter);
    }
  }, [colorPickerDiameter]);

  useEffect(() => {
    if (colorPickerSort) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSort(colorPickerSort);
    }
  }, [colorPickerSort]);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSampleDiameter(diameter);
  }, [colorPickerCanvas, colorPickerPipette]);

  useEffect(() => {
    if (!colorSet) {
      return;
    }
    colorPickerCanvas?.setSamples(
      [...(paletteColorMixtures.get(colorSet.type)?.values() ?? [])].flatMap(
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
  }, [colorPickerCanvas, paletteColorMixtures, colorSet]);

  useEffect(() => {
    colorPickerCanvas?.setOverlayImage(colorMatchImage);
  }, [colorPickerCanvas, colorMatchImage]);

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

  const handleTargetColorChange = (color: AggregationColor) => {
    colorPickerCanvas?.setPipettePoint(null);
    void setTargetColor(color.toHexString(), null);
    void setColorMatchImage(null);
  };

  const handleColorMatchImageClick = () => {
    void setColorMatchImage(colorMatchImage ? null : hexToRgb(targetColor));
  };

  const handleCancelLoading = () => {
    abortPosterizeImage();
    abortBuildPalette();
  };

  const sortedSimilarColors = useMemo(
    () => similarColors.slice().sort(SIMILAR_COLORS_COMPARATORS[sort]),
    [similarColors, sort]
  );

  if (!colorSet) {
    return <EmptyColorSet imageSupported />;
  }

  const {mixing, glazing} = COLOR_MIXING[colorSet.type];

  const sortItems: MenuProps['items'] = (
    [
      [
        ColorPickerSort.BySimilarity,
        t`Similarity`,
        t`Sort by the similarity of the mixture to the target color`,
      ],
      [
        ColorPickerSort.ByNumberOfColors,
        t`Color count`,
        t`Sort by the number of colors in the mixture`,
      ],
      [ColorPickerSort.ByConsistency, t`Thickness`, t`Sort by the thickness of the mixture`],
    ] as [ColorPickerSort, string, string][]
  ).map(([sort, label, title]) => ({
    key: String(sort),
    label,
    title,
    onClick: () => {
      handleSortChange(sort);
    },
  }));

  const availableMaxColors = [24, 36, 48].filter(
    mc => !imageFile?.maxColors || mc < imageFile.maxColors
  );

  const posterizeItems: MenuProps['items'] = [
    {
      type: 'group',
      label: t`Reduce color palette to`,
      children: availableMaxColors.map(colorCount => ({
        key: String(colorCount),
        label: <Plural value={colorCount} one="# color" other="# colors" />,
        onClick: () => {
          void posterizeImage(colorCount);
        },
      })),
    },
  ];

  const height = `calc((100dvh - 75px) / ${screens.sm ? '1' : '2 - 8px'})`;
  const margin = screens.sm ? 0 : 8;

  return (
    <>
      <LoadingIndicator loading={isLoading} onCancel={handleCancelLoading}>
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
              orientation="vertical"
              size="small"
              style={{
                padding: '0 16px 16px',
                width: '100%',
                boxSizing: 'border-box',
              }}
            >
              <Space orientation="vertical" size={0} style={{width: '100%'}}>
                {glazing && (
                  <Form.Item
                    label={t`Background`}
                    tooltip={t`The color of paper or canvas, or the color of the base layer when glazed.`}
                    style={{marginBottom: 0}}
                  >
                    <Space.Compact>
                      <ColorPicker
                        presets={[
                          {
                            label: t(COLOR_PICKER_PRESET_LABELS.PAPER_WHITE),
                            colors: [PAPER_WHITE_HEX],
                          },
                        ]}
                        showText={false}
                        disabledAlpha
                        value={backgroundColor}
                        onChangeComplete={(color: AggregationColor) => {
                          void setBackgroundColor(color.toHexString());
                        }}
                        panelRender={panel => (
                          <div>
                            {isPastel(colorSet.type) && <PastelInfo />}
                            {panel}
                          </div>
                        )}
                      />

                      <Button
                        title={t`Use white paper or canvas as a background`}
                        onClick={() => {
                          void setBackgroundColor(PAPER_WHITE_HEX);
                        }}
                      >
                        <Trans>White</Trans>
                      </Button>
                    </Space.Compact>
                  </Form.Item>
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

                <Space size="small" align="start">
                  <Form.Item
                    label={t`Color`}
                    tooltip={t`The color to be mixed from your color set. Select a color by clicking a point on the image, or use the color picker popup.`}
                    style={{marginBottom: 0}}
                  >
                    <Space.Compact>
                      <ColorPicker
                        value={targetColor}
                        onChangeComplete={handleTargetColorChange}
                        showText={false}
                        disabledAlpha
                      />
                      <Dropdown
                        trigger={['click']}
                        menu={{
                          items: [
                            {
                              key: 'color-match',
                              label: t`Show matching areas`,
                              title: t`Show areas on the photo that match this color`,
                              onClick: handleColorMatchImageClick,
                            },
                          ],
                          selectedKeys: colorMatchImage ? ['color-match'] : undefined,
                        }}
                      >
                        <Button icon={<DownOutlined />} />
                      </Dropdown>
                    </Space.Compact>
                  </Form.Item>

                  {mixing && (
                    <Form.Item style={{marginBottom: 0}}>
                      <Dropdown
                        trigger={['click']}
                        menu={{
                          items: sortItems,
                          selectedKeys: [String(sort)],
                        }}
                      >
                        <Button icon={<SortAscendingOutlined />}>
                          <Trans>Sort</Trans>
                        </Button>
                      </Dropdown>
                    </Form.Item>
                  )}

                  {!screens.md && (
                    <Dropdown
                      trigger={['click']}
                      menu={{
                        items: [
                          {
                            key: 'posterize',
                            label: t`Reduce colors`,
                            title: t`Reduce the number of colors in the photo`,
                            children: posterizeItems,
                          },
                          {
                            key: 'build-palette',
                            label: t`Build palette`,
                            title: t`Automatically find the best color mixtures for this photo`,
                            onClick: () => {
                              void buildPalette();
                            },
                          },
                        ],
                      }}
                    >
                      <Button icon={<MoreOutlined />} />
                    </Dropdown>
                  )}
                </Space>

                {screens.md && (
                  <Space size="small" align="start" style={{marginTop: 8}}>
                    {originalImage && availableMaxColors.length > 0 && (
                      <Dropdown menu={{items: posterizeItems}} trigger={['click']}>
                        <Button
                          icon={<DownOutlined />}
                          iconPlacement="end"
                          title={t`Reduce the number of colors in the photo`}
                        >
                          <Trans>Reduce colors</Trans>
                        </Button>
                      </Dropdown>
                    )}

                    {originalImage && (
                      <Button
                        title={t`Automatically find the best color mixtures for this photo`}
                        onClick={() => {
                          void buildPalette();
                        }}
                      >
                        <Trans>Build palette</Trans>
                      </Button>
                    )}
                  </Space>
                )}

                {screens.md && (
                  <Space size="small" align="center">
                    <Form.Item
                      label={t`Color set`}
                      labelCol={{
                        style: {
                          display: 'flex',
                          alignItems: 'center',
                        },
                      }}
                      style={{marginBottom: 0}}
                    >
                      {colorSet.name || (
                        <ColorSetName brandColorCounts={colorSetToBrandColorCounts(colorSet)} />
                      )}
                    </Form.Item>
                  </Space>
                )}
              </Space>

              {!isSimilarColorsLoading && !similarColors.length ? (
                <Space orientation="vertical" style={{margin: '8px 0'}}>
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
                      className="selected-palette-card"
                    />
                  ))}
                  {sortedSimilarColors.map((similarColor: SimilarColor) => (
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
      </LoadingIndicator>
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
