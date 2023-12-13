/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Checkbox,
  Col,
  ColorPicker,
  Empty,
  Form,
  Grid,
  Row,
  Select,
  Slider,
  Space,
  Spin,
} from 'antd';
import {CheckboxChangeEvent} from 'antd/es/checkbox';
import {Color} from 'antd/es/color-picker';
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
  SimilarColor,
  compareSimilarColorsByDeltaE,
  compareSimilarColorsByPaintMixFractionsLength,
} from '../services/color';
import {RgbTuple} from '../services/color/model';
import {ColorPickerSettings, savePaintMix as savePaintMixInDb} from '../services/db';
import {getColorPickerSettings, saveColorPickerSettings} from '../services/db/';
import {SimilarColorCard} from './color/SimilarColorCard';

enum Sort {
  BySimilarity = 1,
  ByNumberOfPaints = 2,
}

const SIMILAR_COLORS_COMPARATORS = {
  [Sort.BySimilarity]: compareSimilarColorsByDeltaE,
  [Sort.ByNumberOfPaints]: compareSimilarColorsByPaintMixFractionsLength,
};

const MAX_DELTA_E = 2;

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
  blob?: Blob;
  backgroundColor: string;
  setBackgroundColor: Dispatch<SetStateAction<string>>;
  isGlaze: boolean;
  setIsGlaze: Dispatch<SetStateAction<boolean>>;
  paintMixes?: PaintMix[];
  setPaintMixes: Dispatch<SetStateAction<PaintMix[] | undefined>>;
  setAsBackground: (background: string | RgbTuple) => void;
  showReflectanceChart: (paintMix: PaintMix) => void;
};

export const ImageColorPicker: React.FC<Props> = ({
  paintSet,
  blob,
  backgroundColor,
  setBackgroundColor,
  isGlaze,
  setIsGlaze,
  paintMixes,
  setPaintMixes,
  setAsBackground,
  showReflectanceChart,
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

  const {
    ref: canvasRef,
    isLoading: isColorPickerLoading,
    zoomableImageCanvasRef: colorPickerCanvasRef,
  } = useZoomableImageCanvas<ImageColorPickerCanvas>(imageColorPickerCanvasSupplier, blob);

  const [sampleDiameter, setSampleDiameter] = useState<number>(defaultSampleDiameter);
  const [targetColor, setTargetColor] = useState<string>(OFF_WHITE_HEX);
  const [similarColors, setSimilarColors] = useState<SimilarColor[]>([]);
  const [sort, setSort] = useState<Sort>(Sort.BySimilarity);

  const [isPaintSetLoading, setIsPaintSetLoading] = useState<boolean>(false);
  const [isBackgroundColorLoading, setIsBackgroundColorLoading] = useState<boolean>(false);
  const [isSimilarColorsLoading, setIsSimilarColorsLoading] = useState<boolean>(false);
  const isLoading: boolean =
    isColorPickerLoading || isPaintSetLoading || isBackgroundColorLoading || isSimilarColorsLoading;

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
  }, [blob, setBackgroundColor, setIsGlaze]);

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
    if (!colorPickerCanvas) {
      return;
    }
    colorPickerCanvas.setPipetDiameter(sampleDiameter);
  }, [colorPickerCanvasRef, sampleDiameter]);

  const savePaintMix = useCallback(
    async (paintMix: PaintMix) => {
      const newPaintMix: PaintMix = {...paintMix, dataIndex: Date.now()};
      setPaintMixes((prev: PaintMix[] | undefined) =>
        prev ? [newPaintMix, ...prev] : [newPaintMix]
      );
      await savePaintMixInDb(newPaintMix);
    },
    [setPaintMixes]
  );

  const handleBackgroundColorChange = (backgroundColorHex: string) => {
    setBackgroundColor(backgroundColorHex);
  };

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

  return (
    <Spin spinning={isLoading} tip="Loading" size="large" delay={300}>
      <Row>
        <Col xs={24} md={12} lg={16}>
          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              height: `calc((100vh - 75px) / ${screens['md'] ? '1' : '2 - 8px'})`,
              marginBottom: screens['md'] ? 0 : 8,
            }}
          />
        </Col>
        <Col
          xs={24}
          md={12}
          lg={8}
          style={{
            maxHeight: `calc((100vh - 75px) / ${screens['md'] ? '1' : '2 - 8px'})`,
            marginTop: screens['md'] ? 0 : 8,
            overflowY: 'auto',
          }}
        >
          <div style={{padding: '0 16px 8px'}}>
            <Form.Item style={{marginBottom: 0}}>
              <Form.Item
                label="Background"
                tooltip="The color of paper or canvas, or the color of the base layer when glazed."
                style={{
                  display: 'inline-block',
                  marginBottom: 0,
                  marginRight: 16,
                }}
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
                    handleBackgroundColorChange(color.toHexString(true));
                  }}
                  showText
                  disabledAlpha
                />
              </Form.Item>
              <Form.Item
                label="Glaze"
                tooltip="Glazing is a painting technique in which a thin layer of transparent paint is applied over a dried base color layer, mixing optically to rich, iridescent color."
                style={{
                  display: 'inline-block',
                  margin: 0,
                }}
              >
                <Checkbox
                  checked={isGlaze}
                  onChange={(e: CheckboxChangeEvent) => {
                    handleIsGlazeChange(e.target.checked);
                  }}
                />
              </Form.Item>
            </Form.Item>
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
            <Form.Item style={{marginBottom: 0}}>
              <Form.Item
                label="Color"
                tooltip="The color to be mixed from your paint set. Select a color by clicking a point on the image, or use the color picker popup."
                style={{display: 'inline-block', marginBottom: 0, marginRight: 16}}
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
                style={{
                  display: 'inline-block',
                  margin: 0,
                }}
              >
                <Select
                  value={sort}
                  onChange={(value: Sort) => setSort(value)}
                  options={[
                    {value: Sort.BySimilarity, label: 'More similar'},
                    {value: Sort.ByNumberOfPaints, label: 'Less paints'},
                  ]}
                  style={{width: 120}}
                />
              </Form.Item>
            </Form.Item>
          </div>
          {!similarColors.length ? (
            <div style={{padding: '16px', textAlign: 'center'}}>
              <Empty />
            </div>
          ) : (
            <div style={{padding: '8px 16px'}}>
              <Space direction="vertical" size="small" style={{width: '100%'}}>
                {similarColors
                  .slice()
                  .sort(SIMILAR_COLORS_COMPARATORS[sort])
                  .map((similarColor: SimilarColor) => (
                    <SimilarColorCard
                      key={similarColor.paintMix.id}
                      {...{
                        similarColor,
                        setAsBackground,
                        showReflectanceChart,
                        paintMixes,
                        savePaintMix,
                      }}
                    />
                  ))}
              </Space>
            </div>
          )}
        </Col>
      </Row>
    </Spin>
  );
};
