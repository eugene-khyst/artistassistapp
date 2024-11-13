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

import {
  LineChartOutlined,
  LoadingOutlined,
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
  Grid,
  Row,
  Select,
  Space,
  Spin,
  theme,
  Tooltip,
  Typography,
} from 'antd';
import type {Color as PickedColor} from 'antd/es/color-picker';
import type {DefaultOptionType as SelectOptionType} from 'antd/es/select';
import {useEffect, useState} from 'react';

import {AdCard} from '~/src/components/ad/AdCard';
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

import {AddToPaletteButton} from './color/AddToPaletteButton';
import {ColorMixtureDescription} from './color/ColorMixtureDescription';
import {ReflectanceChartDrawer} from './color/ReflectanceChartDrawer';
import {ColorCascader} from './color-set/ColorCascader';
import {EmptyColorSet} from './empty/EmptyColorSet';

function isSupported(colorSet: ColorSet): boolean {
  return ![ColorType.ColoredPencils, ColorType.WatercolorPencils, ColorType.Pastel].includes(
    colorSet.type
  );
}

const RATIO_OPTIONS: SelectOptionType[] = range(1, 9).map((part: number) => ({
  value: part,
  label: part,
}));

const MAX_COLORS = 4;

interface ColorMixerForm {
  colors: {
    color?: [number, number];
    part?: number;
  }[];
}

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
  const isInitialStateLoading = useAppStore(state => state.isInitialStateLoading);

  const screens = Grid.useBreakpoint();

  const {
    token: {colorTextTertiary},
  } = theme.useToken();

  const [form] = Form.useForm();

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
      const divisor = gcd(part1!, part2!, ...otherParts);
      ratio = ratio.map((part: number): number => part / divisor);
    }
    setRatio(ratio);
  };

  if (!colorSet || !isSupported(colorSet)) {
    return <EmptyColorSet feature="color mixing" pencilsSupported={false} />;
  }

  return (
    <Spin
      spinning={isInitialStateLoading}
      tip="Loading"
      indicator={<LoadingOutlined spin />}
      size="large"
    >
      <Flex vertical gap="middle" style={{padding: '0 16px 16px'}}>
        <Typography.Text strong>
          Mix your colors in any proportions so you don&apos;t waste real paints.
        </Typography.Text>

        <Row gutter={[32, 16]} justify="start">
          <Col xs={24} md={12} lg={8}>
            <Space direction="vertical" size="middle">
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
                      setBackgroundColor(color.toHexString());
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
                              onClick={() => {
                                remove(name);
                              }}
                            />
                          )}
                        </Flex>
                      ))}
                      <Form.Item style={{margin: '16px 0 0'}}>
                        <Space>
                          <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            disabled={fields.length >= MAX_COLORS}
                            onClick={() => {
                              add(defaultValue);
                            }}
                          >
                            Add color
                          </Button>
                          <Button
                            icon={<LineChartOutlined />}
                            disabled={!resultColorMixtures.some(isThickConsistency)}
                            onClick={() => {
                              setIsOpenReflectanceChart(true);
                            }}
                          >
                            Reflectance chart
                          </Button>
                        </Space>
                      </Form.Item>
                    </>
                  )}
                </Form.List>
              </Form>
              {screens.md && <AdCard vertical />}
            </Space>
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
                  <AddToPaletteButton
                    colorMixture={colorMixture}
                    linkToImage={false}
                    size="small"
                    style={{marginBottom: 8}}
                  />
                </Space>
              ))}
              {!screens.md && <AdCard vertical />}
            </Space>
          </Col>
        </Row>
      </Flex>
      <ReflectanceChartDrawer
        colorMixture={resultColorMixtures.find(isThickConsistency)}
        showParts
        open={isOpenReflectanceChart}
        onClose={() => {
          setIsOpenReflectanceChart(false);
        }}
      />
    </Spin>
  );
};
