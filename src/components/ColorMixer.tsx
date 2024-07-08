/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  LineChartOutlined,
  MinusOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import {
  Button,
  Col,
  ColorPicker,
  Flex,
  Form,
  Row,
  Select,
  Space,
  theme,
  Tooltip,
  Typography,
} from 'antd';
import type {Color as PickedColor} from 'antd/es/color-picker';
import type {DefaultOptionType as SelectOptionType} from 'antd/es/select';
import {useEffect, useState} from 'react';

import type {Color, ColorMixture, ColorSet} from '~/src/services/color';
import {
  ColorType,
  compareColorMixturesByConsistency,
  isThickConsistency,
  makeColorMixture,
  PAPER_WHITE_HEX,
} from '~/src/services/color';
import {gcd} from '~/src/services/math';
import {useAppStore} from '~/src/stores/app-store';
import {range} from '~/src/utils';

import {SaveToPaletteButton} from './button/SaveToPaletteButton';
import {ColorMixtureDescription} from './color/ColorMixtureDescription';
import {ColorCascader} from './color-set/ColorCascader';
import {ReflectanceChartDrawer} from './drawer/ReflectanceChartDrawer';
import {EmptyColorSet} from './empty/EmptyColorSet';

function isSupported(colorSet: ColorSet): boolean {
  return ![ColorType.ColoredPencils, ColorType.WatercolorPencils].includes(colorSet.type);
}

const RATIO_OPTIONS: SelectOptionType[] = range(1, 9).map((part: number) => ({
  value: part,
  label: part,
}));

type ColorMixerForm = {
  colors: {
    color: [number, number];
    part: number;
  }[];
};

const defaultValue = {
  part: 1,
};

const formInitialValues = {
  colors: [
    {
      ...defaultValue,
    },
  ],
};

export const ColorMixer: React.FC = () => {
  const colorSet = useAppStore(state => state.colorSet);

  const {
    token: {colorTextTertiary},
  } = theme.useToken();

  const [form] = Form.useForm<any>();

  const [backgroundColor, setBackgroundColor] = useState<string>(PAPER_WHITE_HEX);
  const [colors, setColors] = useState<Color[]>([]);
  const [ratio, setRatio] = useState<number[]>([]);
  const [resultColorMixtures, setResultColorMixtures] = useState<ColorMixture[]>([]);
  const [isOpenReflectanceChart, setIsOpenReflectanceChart] = useState<boolean>(false);

  useEffect(() => {
    if (colorSet && isSupported(colorSet)) {
      form.setFieldsValue(formInitialValues);
      setColors([]);
      setRatio([]);
    }
  }, [colorSet, form]);

  useEffect(() => {
    setResultColorMixtures(
      colorSet && colors.length > 0 && colors.length === ratio.length
        ? makeColorMixture(colorSet.type, colors, ratio, backgroundColor).sort(
            compareColorMixturesByConsistency
          )
        : []
    );
  }, [colorSet, colors, ratio, backgroundColor]);

  const handleFormValuesChange = (
    _: Partial<ColorMixerForm>,
    {colors: selectedColors}: ColorMixerForm
  ) => {
    if (!colorSet || !selectedColors.length) {
      return;
    }
    const colors: Color[] = [];
    let ratio: number[] = [];
    selectedColors.forEach(({color: selectedColor, part}) => {
      if (!selectedColor || !part) {
        return;
      }
      const [selectedBrandId, selectedColorId] = selectedColor;
      const color: Color | undefined = colorSet.colors.find(
        ({brand, id}: Color) => brand === selectedBrandId && id === selectedColorId
      );
      if (!color) {
        return;
      }
      colors.push(color);
      ratio.push(part);
    });
    setColors(colors);
    if (ratio.length >= 2) {
      const [part1, part2, ...otherParts] = ratio;
      const divisor = gcd(part1, part2, ...otherParts);
      ratio = ratio.map((part: number): number => part / divisor);
    }
    setRatio(ratio);
  };

  if (!colorSet || !isSupported(colorSet)) {
    return (
      <div style={{padding: '0 16px 16px'}}>
        <EmptyColorSet feature="color mixing" tab="Color mixing" pencilsSupported={false} />
      </div>
    );
  }

  return (
    <>
      <div style={{padding: '0 16px'}}>
        <Typography.Title level={3} style={{marginTop: 0}}>
          Mix colors
        </Typography.Title>
        <Row gutter={[32, 16]} justify="start" style={{marginBottom: 16}}>
          <Col xs={24} md={12} lg={8}>
            <Form
              name="colorMixture"
              form={form}
              initialValues={formInitialValues}
              onValuesChange={handleFormValuesChange}
              requiredMark={false}
              autoComplete="off"
            >
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
                      colors: [PAPER_WHITE_HEX],
                    },
                  ]}
                  onChangeComplete={(color: PickedColor) => {
                    setBackgroundColor(color.toHexString(true));
                  }}
                  showText
                  disabledAlpha
                />
              </Form.Item>
              <Form.Item style={{marginBottom: 0}}>
                <Flex gap="small" align="center">
                  <Typography.Text style={{display: 'inline-block', width: 50}}>
                    Ratio
                  </Typography.Text>
                  <Typography.Text>×</Typography.Text>
                  <Typography.Text>Color</Typography.Text>
                  <Tooltip title="Select any number of colors to mix and specify the part of each color in the resulting mix.">
                    <QuestionCircleOutlined style={{color: colorTextTertiary, cursor: 'help'}} />
                  </Tooltip>
                </Flex>
              </Form.Item>
              <Form.List name="colors">
                {(fields, {add, remove}) => (
                  <>
                    {fields.map(({key, name, ...restField}) => (
                      <Flex key={key} gap="small" align="center" style={{marginBottom: 8}}>
                        <Form.Item {...restField} name={[name, 'part']} style={{marginBottom: 0}}>
                          <Select
                            options={RATIO_OPTIONS}
                            placeholder="Select part"
                            style={{width: 50}}
                          />
                        </Form.Item>
                        {'×'}
                        <Form.Item
                          {...restField}
                          name={[name, 'color']}
                          style={{flexGrow: 1, marginBottom: 0}}
                        >
                          <ColorCascader />
                        </Form.Item>
                        {fields.length > 1 && (
                          <Button
                            shape="circle"
                            icon={<MinusOutlined />}
                            onClick={() => remove(name)}
                          />
                        )}
                      </Flex>
                    ))}
                    <Form.Item style={{margin: '16px 0 0'}}>
                      <Space>
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          disabled={fields.length >= 4}
                          onClick={() => add(defaultValue)}
                        >
                          Add color
                        </Button>
                        <Button
                          icon={<LineChartOutlined />}
                          disabled={!resultColorMixtures.some(isThickConsistency)}
                          onClick={() => setIsOpenReflectanceChart(true)}
                        >
                          Reflectance chart
                        </Button>
                      </Space>
                    </Form.Item>
                  </>
                )}
              </Form.List>
            </Form>
          </Col>
          <Col xs={24} md={12} lg={8}>
            <Space direction="vertical" size="small">
              {resultColorMixtures.map((colorMixture: ColorMixture) => (
                <Space key={colorMixture.key} direction="vertical" size="small" align="end">
                  <ColorMixtureDescription
                    colorMixture={colorMixture}
                    showColors={isThickConsistency(colorMixture)}
                    showConsistency={!isThickConsistency(colorMixture)}
                  />
                  <SaveToPaletteButton
                    colorMixture={colorMixture}
                    linkToImage={false}
                    size="small"
                    style={{marginBottom: 8}}
                  />
                </Space>
              ))}
            </Space>
          </Col>
        </Row>
      </div>
      <ReflectanceChartDrawer
        colorMixture={resultColorMixtures.find(isThickConsistency)}
        open={isOpenReflectanceChart}
        onClose={() => setIsOpenReflectanceChart(false)}
      />
    </>
  );
};
