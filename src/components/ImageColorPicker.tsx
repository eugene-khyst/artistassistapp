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
import {Dispatch, SetStateAction, useCallback, useEffect, useState} from 'react';
import {useZoomableImageCanvas} from '~/src/hooks';
import {
  ColorPickerEventType,
  ImageColorPickerCanvas,
  MIN_COLOR_PICKER_DIAMETER,
  PipetPointSetEvent,
} from '~/src/services/canvas/image';
import {
  ColorMixer,
  PAPER_WHITE_HEX,
  PaintMix,
  PaintSet,
  Pipet,
  SimilarColor,
  compareSimilarColorsByDeltaE,
  compareSimilarColorsByPaintMixFractionsLength,
} from '~/src/services/color';
import {RgbTuple} from '~/src/services/color/model';
import {ColorPickerSettings} from '~/src/services/db';
import {getColorPickerSettings, saveColorPickerSettings} from '~/src/services/db';
import {Vector} from '~/src/services/math';
import {SimilarColorCard} from './color/SimilarColorCard';
import {EmptyPaintSet} from './empty/EmptyPaintSet';

const LIMIT_RESULTS_FOR_MIXES = 5;
const DELTA_E_LIMIT = 2;
const MAX_DELTA_E = 10;
const DEFAULT_SAMPLE_DIAMETER = 10;
const MAX_SAMPLE_DIAMETER = 50;
const SAMPLE_DIAMETER_SLIDER_MARKS: SliderMarks = Object.fromEntries(
  [1, 10, 20, 30, 40, 50].map((i: number) => [i, i])
);

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
  savePaintMix: (paintMix: PaintMix, isNew?: boolean) => void;
  deletePaintMix: (paintMixId: string) => void;
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
  savePaintMix,
  deletePaintMix,
  setAsBackground,
}: Props) => {
  const screens = Grid.useBreakpoint();

  const {ref: canvasRef, zoomableImageCanvas: colorPickerCanvas} =
    useZoomableImageCanvas<ImageColorPickerCanvas>(imageColorPickerCanvasSupplier, images);

  const [sampleDiameter, setSampleDiameter] = useState<number>(DEFAULT_SAMPLE_DIAMETER);
  const [targetColor, setTargetColor] = useState<string>(PAPER_WHITE_HEX);
  const [similarColors, setSimilarColors] = useState<SimilarColor[]>([]);
  const [sort, setSort] = useState<Sort>(Sort.BySimilarity);

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
  }, [colorPickerCanvas]);

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
    setBackgroundColor(PAPER_WHITE_HEX);
    setIsGlaze(false);
    setTargetColor(PAPER_WHITE_HEX);
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
        LIMIT_RESULTS_FOR_MIXES,
        DELTA_E_LIMIT,
        true,
        MAX_DELTA_E
      );
      setSimilarColors(foundSimilarColors);
      setIsSimilarColorsLoading(false);
    })();
  }, [targetColor, isGlaze, paintSet, backgroundColor]);

  useEffect(() => {
    colorPickerCanvas?.setPipetDiameter(sampleDiameter);
  }, [colorPickerCanvas, sampleDiameter]);

  useEffect(() => {
    if (!colorPickerCanvas || !pipet) {
      return;
    }
    const {x, y, diameter} = pipet;
    colorPickerCanvas.setPipetDiameter(diameter);
    colorPickerCanvas.setPipetPoint(new Vector(x, y));
    colorPickerCanvas.setMinZoom();
    setSampleDiameter(diameter);
  }, [colorPickerCanvas, pipet]);

  const saveNewPaintMix = useCallback(
    async (paintMix: PaintMix) => {
      const newPaintMix: PaintMix = {
        ...paintMix,
        imageFileId,
        pipet: getPipet(colorPickerCanvas),
        dataIndex: Date.now(),
      };
      savePaintMix(newPaintMix, true);
    },
    [colorPickerCanvas, imageFileId, savePaintMix]
  );

  const handleIsGlazeChange = (isGlaze: boolean) => {
    setIsGlaze(isGlaze);
    if (!isGlaze) {
      setBackgroundColor(PAPER_WHITE_HEX);
    }
  };

  const handleSampleDiameterChange = (sampleDiameter: number) => {
    setSampleDiameter(sampleDiameter);
    saveColorPickerSettings({
      sampleDiameter: sampleDiameter,
    });
  };

  const handleTargetColorChange = (color: string) => {
    colorPickerCanvas?.setPipetPoint(null);
    setTargetColor(color);
  };

  if (!paintSet) {
    return (
      <div style={{padding: '0 16px 16px'}}>
        <EmptyPaintSet feature="color picker" tab="Color picker" photoSupported={true} />
      </div>
    );
  }

  const height = `calc((100vh - 75px) / ${screens['sm'] ? '1' : '2 - 8px'})`;
  const margin = screens['sm'] ? 0 : 8;

  return (
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
                      label: 'Paper white',
                      colors: [PAPER_WHITE_HEX],
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
                max={MAX_SAMPLE_DIAMETER}
                marks={SAMPLE_DIAMETER_SLIDER_MARKS}
                style={{width: 250}}
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
                    handleTargetColorChange(color.toHexString(true));
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
            {!isSimilarColorsLoading && !similarColors.length ? (
              <div style={{margin: '8px 0'}}>
                <Typography.Text strong>⁉️ No data</Typography.Text>
                <br />
                <Typography.Text strong>
                  Click 🖱️ or tap 👆 anywhere in the photo, or use the color picker pop-up to choose
                  a target color to mix from your colors.
                </Typography.Text>
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
                    paintMixes={paintMixes}
                    savePaintMix={saveNewPaintMix}
                    deletePaintMix={deletePaintMix}
                  />
                ))
            )}
          </Space>
        </Col>
      </Row>
    </Spin>
  );
};
