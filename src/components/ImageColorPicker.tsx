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

import {
  CloseCircleOutlined,
  DownOutlined,
  SortAscendingOutlined,
  UpOutlined,
} from '@ant-design/icons';
import {Plural, Trans, useLingui} from '@lingui/react/macro';
import type {CheckboxChangeEvent} from 'antd';
import {Button, Checkbox, Col, Dropdown, Form, Grid, Row, Slider, Space} from 'antd';
import type {AggregationColor} from 'antd/es/color-picker/color';
import type {SliderMarks} from 'antd/es/slider';
import type {MenuProps} from 'antd/lib';
import {useCallback, useEffect, useState} from 'react';

import {AdCard} from '~/src/components/ad/AdCard';
import {ColorPicker} from '~/src/components/color/ColorPicker';
import {ReflectanceChartDrawer} from '~/src/components/color/ReflectanceChartDrawer';
import {SimilarColorsList} from '~/src/components/color/SimilarColorsList';
import {UnderlayerColorPicker} from '~/src/components/color/UnderlayerColorPicker';
import {ColorCascader} from '~/src/components/color-set/ColorCascader';
import {ColorSetName} from '~/src/components/color-set/ColorSetName';
import {LoadingIndicator} from '~/src/components/loading/LoadingIndicator';
import {useDebounce} from '~/src/hooks/useDebounce';
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
import {COLOR_MIXING} from '~/src/services/color/color-mixer';
import {colorSetToBrandColorCounts, isPastel} from '~/src/services/color/colors';
import {hexToRgb, rgbToHex} from '~/src/services/color/space/rgb';
import {type ColorMixture, Layering} from '~/src/services/color/types';
import {Vector} from '~/src/services/math/geometry';
import {ColorPickerSort} from '~/src/services/settings/types';
import {useAppStore} from '~/src/stores/app-store';

import {EmptyColorSet} from './empty/EmptyColorSet';

interface SortOption {
  sort: ColorPickerSort;
  label: string;
  title: string;
}

const SAMPLE_DIAMETER_SLIDER_MARKS: SliderMarks = Object.fromEntries(
  [1, 10, 20, 30, 40, 50].map((i: number) => [i, i])
);

export function ImageColorPicker() {
  const colorPickerSort = useAppStore(state => state.appSettings.colorPickerSort);
  const colorPickerLayeringEnabled = useAppStore(
    state => state.appSettings.colorPickerLayeringEnabled
  );
  const colorPickerSurfaceHex = useAppStore(state => state.appSettings.colorPickerSurfaceHex);
  const colorSet = useAppStore(state => state.colorSet);
  const imageFile = useAppStore(state => state.imageFile);
  const originalImage = useAppStore(state => state.originalImage);
  const colorMatchImage = useAppStore(state => state.colorMatchImage);
  const underlayerHex = useAppStore(state => state.underlayerHex);
  const motherColorId = useAppStore(state => state.motherColorId);
  const targetColorHex = useAppStore(state => state.targetColorHex);
  const colorPickerPipette = useAppStore(state => state.colorPickerPipette);
  const paletteColorMixtures = useAppStore(state => state.paletteColorMixtures);

  const isColorMixerLoading = useAppStore(state => state.isColorMixerLoading);
  const isOriginalImageLoading = useAppStore(state => state.isOriginalImageLoading);
  const isSampleImageLoading = useAppStore(state => state.isSampleImageLoading);
  const isPosterizedImageLoading = useAppStore(state => state.isPosterizedImageLoading);
  const isBuildPaletteLoading = useAppStore(state => state.isBuildPaletteLoading);
  const isColorMatchImageLoading = useAppStore(state => state.isColorMatchImageLoading);
  const isSimilarColorsLoading = useAppStore(state => state.isSimilarColorsLoading);

  const setTargetColor = useAppStore(state => state.setTargetColor);
  const setUnderlayer = useAppStore(state => state.setUnderlayer);
  const setSurface = useAppStore(state => state.setSurface);
  const setLayeringEnabled = useAppStore(state => state.setLayeringEnabled);
  const setMotherColor = useAppStore(state => state.setMotherColor);
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
        setColorMatchImage(null);
      };
      colorPickerCanvas.events.subscribe(ColorPickerEventType.PipettePointSet, listener);
      return colorPickerCanvas;
    },
    [setTargetColor, selectPaletteColorMixtures, setColorMatchImage]
  );

  const {ref: canvasRef, zoomableImageCanvas: colorPickerCanvas} =
    useZoomableImageCanvas<ImageColorPickerCanvas>(imageColorPickerCanvasSupplier, originalImage);

  const [sampleDiameter, setSampleDiameter] = useState<number>(
    () => useAppStore.getState().appSettings.colorPickerDiameter ?? 10
  );
  const [isExpandedControls, setIsExpandedControls] = useState(false);
  const [reflectanceChartColorMixture, setReflectanceChartColorMixture] = useState<ColorMixture>();
  const [isOpenReflectanceChart, setIsOpenReflectanceChart] = useState<boolean>(false);

  const isLoading: boolean =
    isColorMixerLoading ||
    isOriginalImageLoading ||
    isSampleImageLoading ||
    isPosterizedImageLoading ||
    isBuildPaletteLoading ||
    isColorMatchImageLoading ||
    isSimilarColorsLoading;

  const sampleDiameterDebounced = useDebounce(sampleDiameter, 300);

  useEffect(() => {
    colorPickerCanvas?.setPipetteDiameter(sampleDiameterDebounced);
    if (sampleDiameterDebounced !== useAppStore.getState().appSettings.colorPickerDiameter) {
      void saveAppSettings({colorPickerDiameter: sampleDiameterDebounced});
    }
  }, [colorPickerCanvas, sampleDiameterDebounced, saveAppSettings]);

  const [prevPipette, setPrevPipette] = useState(colorPickerPipette);
  if (colorPickerPipette !== prevPipette) {
    setPrevPipette(colorPickerPipette);
    if (colorPickerPipette) {
      setSampleDiameter(colorPickerPipette.diameter);
    }
  }

  useEffect(() => {
    if (!colorPickerCanvas || !colorPickerPipette) {
      return;
    }
    const {x, y, diameter} = colorPickerPipette;
    colorPickerCanvas.setPipetteDiameter(diameter);
    colorPickerCanvas.setPipettePoint(new Vector(x, y));
    colorPickerCanvas.zoomToFit();
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
  };

  const handleSortChange = (value: ColorPickerSort) => {
    void saveAppSettings({colorPickerSort: value});
  };

  const handleTargetColorChange = (color: AggregationColor) => {
    colorPickerCanvas?.setPipettePoint(null);
    void setTargetColor(color.toHexString(), null);
    setColorMatchImage(null);
  };

  const handleColorMatchImageClick = () => {
    if (targetColorHex) {
      setColorMatchImage(colorMatchImage ? null : hexToRgb(targetColorHex));
    }
  };

  const handleCancelLoading = () => {
    abortPosterizeImage();
    abortBuildPalette();
  };

  if (!colorSet) {
    return <EmptyColorSet imageSupported />;
  }

  const pastel: boolean = isPastel(colorSet.type);
  const {mixing, layering} = COLOR_MIXING[colorSet.type];
  const sort =
    colorPickerSort === ColorPickerSort.ByConsistency && !(layering && colorPickerLayeringEnabled)
      ? ColorPickerSort.BySimilarity
      : colorPickerSort;

  const colorSetName = (
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
        {colorSet.name || <ColorSetName brandColorCounts={colorSetToBrandColorCounts(colorSet)} />}
      </Form.Item>
    </Space>
  );

  const diameterSlider = (
    <Form.Item
      label={t`Sample size`}
      labelCol={{style: {paddingBottom: 0}}}
      tooltip={t`Controls how large an area is averaged when you pick a color from the photo.`}
      style={{marginBottom: 0}}
    >
      <Slider
        value={sampleDiameter}
        onChange={handleSampleDiameterChange}
        min={MIN_COLOR_PICKER_DIAMETER}
        max={50}
        marks={SAMPLE_DIAMETER_SLIDER_MARKS}
        style={{marginBlock: '4px 22px'}}
      />
    </Form.Item>
  );

  const targetColorPicker = (
    <Form.Item
      label={t`Target color`}
      labelCol={{style: {paddingBottom: 0}}}
      tooltip={t`The color to be mixed from your color set. Select a color by clicking a point on the image, or use the color picker popup.`}
      style={{marginBottom: 0}}
    >
      <Space.Compact>
        <ColorPicker
          title={t`Target color`}
          value={targetColorHex}
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
                title: t`Show areas on the photo that match this color.`,
                onClick: handleColorMatchImageClick,
                disabled: !targetColorHex,
              },
            ],
            selectedKeys: colorMatchImage ? ['color-match'] : undefined,
          }}
        >
          <Button icon={<DownOutlined />} />
        </Dropdown>
      </Space.Compact>
    </Form.Item>
  );

  const underlayerColorPicker = (
    <UnderlayerColorPicker
      underlayerHex={underlayerHex}
      setUnderlayerHex={setUnderlayer}
      surfaceHex={colorPickerSurfaceHex}
      setSurfaceHex={setSurface}
    />
  );

  const glazingCheckbox = (
    <Form.Item
      label={pastel ? t`Blending` : t`Glazing`}
      labelCol={{style: {paddingBottom: 0}}}
      tooltip={t`Include transparent layers over the surface or underlayer when finding matches.`}
      style={{marginBottom: 0}}
    >
      <Checkbox
        checked={colorPickerLayeringEnabled}
        onChange={(e: CheckboxChangeEvent) => {
          void setLayeringEnabled(e.target.checked);
        }}
      />
    </Form.Item>
  );

  const motherColorCascader = (
    <Form.Item
      label={t`Unifying color`}
      labelCol={{style: {paddingBottom: 0}}}
      tooltip={t`A color mixed into every suggested mixture to help the palette feel more harmonious. Also known as a mother color.`}
      style={{marginBottom: 0}}
    >
      <Space.Compact style={{display: 'flex'}}>
        <ColorCascader
          value={motherColorId ?? undefined}
          onChange={color => {
            void setMotherColor(color);
          }}
          style={{minWidth: 0, flex: 1}}
        />
        <Button
          icon={<CloseCircleOutlined />}
          title={t`Clear unifying color`}
          onClick={() => {
            void setMotherColor(null);
          }}
        />
      </Space.Compact>
    </Form.Item>
  );

  const availableMaxColors = [24, 36, 48].filter(
    mc => !imageFile?.maxColors || mc < imageFile.maxColors
  );

  const posterizeItems: MenuProps['items'] =
    availableMaxColors.length > 0
      ? [
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
        ]
      : [];

  const reduceColorsDropdown = (
    <Dropdown menu={{items: posterizeItems}} trigger={['click']}>
      <Button
        icon={<DownOutlined />}
        iconPlacement="end"
        title={t`Reduce the number of colors in the photo.`}
      >
        <Trans>Reduce colors</Trans>
      </Button>
    </Dropdown>
  );

  const autoPaletteButton = (
    <Button
      title={t`Automatically find the best color mixtures for this photo.`}
      onClick={() => {
        void buildPalette();
      }}
    >
      <Trans>Auto palette</Trans>
    </Button>
  );

  const sortItems: MenuProps['items'] = (
    [
      {
        sort: ColorPickerSort.BySimilarity,
        label: t`Similarity`,
        title: t`Sort by the similarity of the mixture to the target color, from highest to lowest.`,
      },
      {
        sort: ColorPickerSort.ByNumberOfColors,
        label: t`Color count`,
        title: t`Sort by the number of colors in the mixture, from fewest to most.`,
      },
      layering && colorPickerLayeringEnabled
        ? {
            sort: ColorPickerSort.ByConsistency,
            label: t`Opacity`,
            title: t`Sort by mixture opacity, from opaque to transparent.`,
          }
        : null,
    ] as (SortOption | null)[]
  )
    .filter((o): o is SortOption => !!o)
    .map(({sort, label, title}) => ({
      key: String(sort),
      label,
      title,
      onClick: () => {
        handleSortChange(sort);
      },
    }));

  const sortButton = mixing && (
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
  );

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
              <Space orientation="vertical" size="small" style={{width: '100%'}}>
                {screens.md ? (
                  <>
                    {colorSetName}
                    {diameterSlider}
                    {targetColorPicker}
                    <Space size="middle">
                      {underlayerColorPicker}
                      {layering !== Layering.None && glazingCheckbox}
                    </Space>
                    {mixing && motherColorCascader}
                    <Space size="small">
                      {originalImage && availableMaxColors.length > 0 && reduceColorsDropdown}
                      {originalImage && autoPaletteButton}
                      {sortButton}
                    </Space>
                  </>
                ) : (
                  <>
                    {diameterSlider}
                    <Space>
                      {targetColorPicker}
                      {sortButton}
                      <Button
                        icon={isExpandedControls ? <UpOutlined /> : <DownOutlined />}
                        iconPlacement="end"
                        onClick={() => {
                          setIsExpandedControls(v => !v);
                        }}
                      >
                        {isExpandedControls ? <Trans>Less</Trans> : <Trans>More</Trans>}
                      </Button>
                    </Space>
                    {isExpandedControls && (
                      <Space orientation="vertical" size="small" style={{width: '100%'}}>
                        {colorSetName}
                        <Space size="middle">
                          {underlayerColorPicker}
                          {layering !== Layering.None && glazingCheckbox}
                        </Space>
                        {mixing && motherColorCascader}
                        <Space size="small">
                          {originalImage && availableMaxColors.length > 0 && reduceColorsDropdown}
                          {originalImage && autoPaletteButton}
                        </Space>
                      </Space>
                    )}
                  </>
                )}
              </Space>

              <SimilarColorsList
                sort={sort}
                onReflectanceChartClick={handleReflectanceChartClick}
              />

              <AdCard vertical />
            </Space>
          </Col>
        </Row>
      </LoadingIndicator>
      <ReflectanceChartDrawer
        defaultChartMode="similarity"
        colorMixture={reflectanceChartColorMixture}
        targetColorHex={targetColorHex}
        open={isOpenReflectanceChart}
        onClose={() => {
          setIsOpenReflectanceChart(false);
        }}
      />
    </>
  );
}
