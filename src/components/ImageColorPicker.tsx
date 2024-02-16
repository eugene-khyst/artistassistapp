/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Checkbox,
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
import {CheckboxChangeEvent} from 'antd/es/checkbox';
import {Color} from 'antd/es/color-picker';
import {DefaultOptionType as SelectOptionType} from 'antd/es/select';
import {SliderMarks} from 'antd/es/slider';
import {Remote, wrap} from 'comlink';
import {Dispatch, SetStateAction, useCallback, useContext, useEffect, useState} from 'react';
import {AppConfig, AppConfigContext} from '../context/AppConfigContext';
import {useZoomableImageCanvas} from '../hooks/';
import {
  ColorPickerEventType,
  ImageColorPickerCanvas,
  MIN_COLOR_PICKER_DIAMETER,
  PipetPointSetEvent,
} from '../services/canvas/image';
import {
  ColorMixer,
  OFF_WHITE_HEX,
  PaintMix,
  PaintSet,
  Pipet,
  SimilarColor,
  compareSimilarColorsByDeltaE,
  compareSimilarColorsByPaintMixFractionsLength,
} from '../services/color';
import {RgbTuple} from '../services/color/model';
import {
  ColorPickerSettings,
  deletePaintMix as deletePaintMixFromDb,
  savePaintMix as savePaintMixInDb,
} from '../services/db';
import {getColorPickerSettings, saveColorPickerSettings} from '../services/db/';
import {Vector} from '../services/math';
import {SimilarColorCard} from './color/SimilarColorCard';
import {ReflectanceChartDrawer} from './drawer/ReflectanceChartDrawer';

enum Sort {
  BySimilarity = 1,
  ByNumberOfPaints = 2,
}

const SIMILAR_COLORS_COMPARATORS = {
  [Sort.BySimilarity]: compareSimilarColorsByDeltaE,
  [Sort.ByNumberOfPaints]: compareSimilarColorsByPaintMixFractionsLength,
};

const SORT_OPTIONS: SelectOptionType[] = [
  {value: Sort.BySimilarity, label: 'Similarity'},
  {value: Sort.ByNumberOfPaints, label: 'Color count'},
];

const MAX_DELTA_E = 2;

function getPipet(colorPickerCanvas?: ImageColorPickerCanvas): Pipet | undefined {
  if (colorPickerCanvas) {
    const pipetPoint = colorPickerCanvas.getPipetPoint();
    if (pipetPoint) {
      const {x, y} = pipetPoint;
      const diameter = colorPickerCanvas.getLastPipetDiameter();
      return {x, y, diameter};
    }
  }
}

const colorMixer: Remote<ColorMixer> = wrap(
  new Worker(new URL('../services/color/worker/color-mixer-worker.ts', import.meta.url), {
    type: 'module',
  })
);

const imageColorPickerCanvasSupplier = (canvas: HTMLCanvasElement): ImageColorPickerCanvas => {
  return new ImageColorPickerCanvas(canvas);
};

type Props = {
  paintSet?: PaintSet;
  imageFileId?: number;
  images: ImageBitmap[];
  isImagesLoading: boolean;
  backgroundColor: string;
  setBackgroundColor: Dispatch<SetStateAction<string>>;
  isGlaze: boolean;
  setIsGlaze: Dispatch<SetStateAction<boolean>>;
  pipet?: Pipet;
  paintMixes?: PaintMix[];
  setPaintMixes: Dispatch<SetStateAction<PaintMix[] | undefined>>;
  setAsBackground: (background: string | RgbTuple) => void;
};

export const ImageColorPicker: React.FC<Props> = ({
  paintSet,
  imageFileId,
  images,
  isImagesLoading,
  backgroundColor,
  setBackgroundColor,
  isGlaze,
  setIsGlaze,
  pipet,
  paintMixes,
  setPaintMixes,
  setAsBackground,
}: Props) => {
  const screens = Grid.useBreakpoint();

  const {
    limitResultsForMixes,
    defaultSampleDiameter,
    maxSampleDiameter,
    sampleDiameterSliderMarkValues,
  } = useContext<AppConfig>(AppConfigContext);
  const sampleDiameterSliderMarks: SliderMarks = Object.fromEntries(
    sampleDiameterSliderMarkValues.map((i: number) => [i, i])
  );

  const {ref: canvasRef, zoomableImageCanvasRef: colorPickerCanvasRef} =
    useZoomableImageCanvas<ImageColorPickerCanvas>(imageColorPickerCanvasSupplier, images);

  const [sampleDiameter, setSampleDiameter] = useState<number>(defaultSampleDiameter);
  const [targetColor, setTargetColor] = useState<string>(OFF_WHITE_HEX);
  const [similarColors, setSimilarColors] = useState<SimilarColor[]>([]);
  const [sort, setSort] = useState<Sort>(Sort.BySimilarity);

  const [reflectanceChartPaintMix, setReflectanceChartPaintMix] = useState<PaintMix | undefined>();
  const [isOpenReflectanceChart, setIsOpenReflectanceChart] = useState<boolean>(false);

  const [isPaintSetLoading, setIsPaintSetLoading] = useState<boolean>(false);
  const [isBackgroundColorLoading, setIsBackgroundColorLoading] = useState<boolean>(false);
  const [isSimilarColorsLoading, setIsSimilarColorsLoading] = useState<boolean>(false);
  const isLoading: boolean =
    isImagesLoading || isPaintSetLoading || isBackgroundColorLoading || isSimilarColorsLoading;

  useEffect(() => {
    (async () => {
      const settings: ColorPickerSettings | undefined = await getColorPickerSettings();
      if (settings?.sampleDiameter) {
        setSampleDiameter(settings.sampleDiameter);
      }
    })();
  }, []);

  useEffect(() => {
    const colorPickerCanvas = colorPickerCanvasRef.current;
    if (!colorPickerCanvas) {
      return;
    }
    const listener = async ({rgb}: PipetPointSetEvent) => {
      setTargetColor(rgb.toHex());
    };
    colorPickerCanvas.events.subscribe(ColorPickerEventType.PipetPointSet, listener);
    return () => {
      colorPickerCanvas.events.unsubscribe(ColorPickerEventType.PipetPointSet, listener);
    };
  }, [colorPickerCanvasRef]);

  useEffect(() => {
    (async () => {
      if (!paintSet) {
        return;
      }
      setIsPaintSetLoading(true);
      await colorMixer.setPaintSet(paintSet);
      setIsPaintSetLoading(false);
    })();
  }, [paintSet]);

  useEffect(() => {
    setBackgroundColor(OFF_WHITE_HEX);
    setIsGlaze(false);
    setTargetColor(OFF_WHITE_HEX);
    setSimilarColors([]);
  }, [images, setBackgroundColor, setIsGlaze]);

  useEffect(() => {
    (async () => {
      if (!backgroundColor) {
        return;
      }
      setIsBackgroundColorLoading(true);
      await colorMixer.setBackground(backgroundColor);
      setIsBackgroundColorLoading(false);
    })();
  }, [backgroundColor]);

  useEffect(() => {
    (async () => {
      setSimilarColors([]);
      setIsSimilarColorsLoading(true);
      const foundSimilarColors: SimilarColor[] = await colorMixer.findSimilarColors(
        targetColor,
        isGlaze,
        MAX_DELTA_E,
        limitResultsForMixes
      );
      setSimilarColors(foundSimilarColors);
      setIsSimilarColorsLoading(false);
    })();
  }, [targetColor, isGlaze, limitResultsForMixes, paintSet, backgroundColor]);

  useEffect(() => {
    const colorPickerCanvas = colorPickerCanvasRef.current;
    colorPickerCanvas?.setPipetDiameter(sampleDiameter);
  }, [colorPickerCanvasRef, sampleDiameter]);

  useEffect(() => {
    const colorPickerCanvas = colorPickerCanvasRef.current;
    if (colorPickerCanvas && pipet) {
      const {x, y, diameter} = pipet;
      colorPickerCanvas.setPipetDiameter(diameter);
      colorPickerCanvas.setPipetPoint(new Vector(x, y));
      setSampleDiameter(diameter);
    }
  }, [colorPickerCanvasRef, pipet]);

  const savePaintMix = useCallback(
    async (paintMix: PaintMix) => {
      const newPaintMix: PaintMix = {
        ...paintMix,
        imageFileId,
        pipet: getPipet(colorPickerCanvasRef.current),
        dataIndex: Date.now(),
      };
      setPaintMixes((prev: PaintMix[] | undefined) =>
        prev ? [newPaintMix, ...prev] : [newPaintMix]
      );
      await savePaintMixInDb(newPaintMix);
    },
    [setPaintMixes, imageFileId, colorPickerCanvasRef]
  );

  const deletePaintMix = useCallback(
    (paintMixId: string) => {
      setPaintMixes((prev: PaintMix[] | undefined) =>
        prev ? prev.filter(({id}: PaintMix) => id !== paintMixId) : []
      );
      deletePaintMixFromDb(paintMixId);
    },
    [setPaintMixes]
  );

  const handleIsGlazeChange = (isGlaze: boolean) => {
    setIsGlaze(isGlaze);
    if (!isGlaze) {
      setBackgroundColor(OFF_WHITE_HEX);
    }
  };

  const handleSampleDiameterChange = (sampleDiameter: number) => {
    setSampleDiameter(sampleDiameter);
    saveColorPickerSettings({
      sampleDiameter: sampleDiameter,
    });
  };

  const showReflectanceChart = (paintMix: PaintMix) => {
    setReflectanceChartPaintMix(paintMix);
    setIsOpenReflectanceChart(true);
  };

  const height = `calc((100vh - 75px) / ${screens['sm'] ? '1' : '2 - 8px'})`;
  const margin = screens['sm'] ? 0 : 8;

  return (
    <>
      <Spin spinning={isLoading} tip="Loading" size="large" delay={300}>
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
            <Space direction="vertical" style={{padding: '0 16px'}}>
              <Space align="center" wrap style={{display: 'flex'}}>
                <Form.Item
                  label="Background"
                  tooltip="The color of paper or canvas, or the color of the base layer when glazed."
                  style={{marginBottom: 0}}
                >
                  <ColorPicker
                    value={backgroundColor}
                    presets={[
                      {
                        label: 'Recommended',
                        colors: [OFF_WHITE_HEX],
                      },
                    ]}
                    onChangeComplete={(color: Color) => {
                      setBackgroundColor(color.toHexString(true));
                    }}
                    showText
                    disabledAlpha
                  />
                </Form.Item>
                <Form.Item
                  label="Glaze"
                  tooltip="Glazing is a painting technique in which a thin layer of transparent paint is applied over a dried base color layer, mixing optically to rich, iridescent color."
                  style={{marginBottom: 0}}
                >
                  <Checkbox
                    checked={isGlaze}
                    onChange={(e: CheckboxChangeEvent) => {
                      handleIsGlazeChange(e.target.checked);
                    }}
                  />
                </Form.Item>
              </Space>
              <Form.Item
                label="Diameter"
                tooltip="The diameter of the circular area around the cursor, used to calculate the average color of the pixels within the area."
                style={{marginBottom: 0}}
              >
                <Slider
                  value={sampleDiameter}
                  onChange={(value: number) => handleSampleDiameterChange(value)}
                  min={MIN_COLOR_PICKER_DIAMETER}
                  max={maxSampleDiameter}
                  marks={sampleDiameterSliderMarks}
                />
              </Form.Item>
              <Space align="center" wrap style={{display: 'flex'}}>
                <Form.Item
                  label="Color"
                  tooltip="The color to be mixed from your paint set. Select a color by clicking a point on the image, or use the color picker popup."
                  style={{marginBottom: 0}}
                >
                  <ColorPicker
                    value={targetColor}
                    onChangeComplete={(color: Color) => {
                      setTargetColor(color.toHexString(true));
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
                    onChange={(value: Sort) => setSort(value)}
                    options={SORT_OPTIONS}
                    style={{width: 115}}
                  />
                </Form.Item>
              </Space>
              {!similarColors.length ? (
                <div style={{margin: '8px 0'}}>
                  <Typography.Text strong>⁉️ No data</Typography.Text>
                  <br />
                  Click 🖱️ or tap 👆 anywhere on the image to choose a color
                </div>
              ) : (
                similarColors
                  .slice()
                  .sort(SIMILAR_COLORS_COMPARATORS[sort])
                  .map((similarColor: SimilarColor) => (
                    <SimilarColorCard
                      key={similarColor.paintMix.id}
                      similarColor={similarColor}
                      setAsBackground={setAsBackground}
                      showReflectanceChart={showReflectanceChart}
                      paintMixes={paintMixes}
                      savePaintMix={savePaintMix}
                      deletePaintMix={deletePaintMix}
                    />
                  ))
              )}
            </Space>
          </Col>
        </Row>
      </Spin>
      <ReflectanceChartDrawer
        paintMix={reflectanceChartPaintMix}
        open={isOpenReflectanceChart}
        onClose={() => setIsOpenReflectanceChart(false)}
      />
    </>
  );
};
