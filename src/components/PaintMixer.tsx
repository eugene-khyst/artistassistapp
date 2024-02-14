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
import {Button, ColorPicker, Form, InputNumber, Space, Tooltip, Typography, theme} from 'antd';
import {Color} from 'antd/es/color-picker';
import {useEffect, useState} from 'react';
import {
  OFF_WHITE_HEX,
  Paint,
  PaintBrand,
  PaintMix,
  PaintSet,
  comparePaintMixesByConsistency,
  isThickConsistency,
  mixPaints,
} from '../services/color';
import {gcd} from '../services/math';
import {PaintCascader} from './color/PaintCascader';
import {PaintMixDescription} from './color/PaintMixDescription';
import {ReflectanceChartDrawer} from './drawer/ReflectanceChartDrawer';

type PaintMixerForm = {
  colors: {
    color: [PaintBrand, number];
    fraction: number;
  }[];
};

const defaultValue = {
  fraction: 1,
};

const formInitialValues = {
  colors: [
    {
      ...defaultValue,
    },
  ],
};

type Props = {
  paintSet?: PaintSet;
};

export const PaintMixer: React.FC<Props> = ({paintSet}: Props) => {
  const {
    token: {colorTextTertiary},
  } = theme.useToken();

  const [form] = Form.useForm<any>();

  const [backgroundColor, setBackgroundColor] = useState<string>(OFF_WHITE_HEX);
  const [paints, setPaints] = useState<Paint[]>([]);
  const [fractions, setFractions] = useState<number[]>([]);
  const [paintMixes, setPaintMixes] = useState<PaintMix[]>([]);
  const [isOpenReflectanceChart, setIsOpenReflectanceChart] = useState<boolean>(false);

  useEffect(() => {
    if (paintSet) {
      form.setFieldsValue(formInitialValues);
      setPaints([]);
      setFractions([]);
    }
  }, [paintSet, form]);

  useEffect(() => {
    setPaintMixes(
      paints.length > 0 && paints.length === fractions.length
        ? mixPaints(paints, fractions, backgroundColor).sort(comparePaintMixesByConsistency)
        : []
    );
  }, [paints, fractions, backgroundColor]);

  const handleFormValuesChange = async (_: Partial<PaintMixerForm>, {colors}: PaintMixerForm) => {
    if (!paintSet || !colors.length) {
      return;
    }
    const paints: Paint[] = [];
    let fractions: number[] = [];
    colors.forEach(({color, fraction}) => {
      if (!color || !fraction) {
        return;
      }
      const [paintBrand, paintId] = color;
      const paint: Paint | undefined = paintSet.colors.find(
        ({brand, id}: Paint) => brand === paintBrand && id === paintId
      );
      if (!paint) {
        return;
      }
      paints.push(paint);
      fractions.push(fraction);
    });
    setPaints(paints);
    if (fractions.length >= 2) {
      const [fraction1, fraction2, ...restFractions] = fractions;
      const divisor = gcd(fraction1, fraction2, ...restFractions);
      fractions = fractions.map((fraction: number): number => fraction / divisor);
    }
    setFractions(fractions);
  };

  if (!paintSet) {
    return <></>;
  }

  const {colors} = paintSet;

  return (
    <>
      <div style={{padding: '0 16px'}}>
        <Typography.Title level={3} style={{marginTop: '0.5em'}}>
          Mix colors
        </Typography.Title>
        <Space size="large" align="start" wrap>
          <Form
            name="paintMix"
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
            <Form.Item style={{marginBottom: 0}}>
              <Space>
                <span style={{display: 'inline-block', width: 50}}>Ratio</span>
                <span>×</span>
                <span>Color</span>
                <Tooltip title="Select any number of colors to mix and specify the fraction of each color in the resulting mix.">
                  <QuestionCircleOutlined style={{color: colorTextTertiary, cursor: 'help'}} />
                </Tooltip>
              </Space>
            </Form.Item>
            <Form.List name="colors">
              {(fields, {add, remove}) => (
                <>
                  {fields.map(({key, name, ...restField}) => (
                    <Space key={key} align="center" wrap style={{display: 'flex', marginBottom: 8}}>
                      <Form.Item
                        {...restField}
                        name={[name, 'fraction']}
                        style={{display: 'inline-block', marginBottom: 0}}
                      >
                        <InputNumber min={1} max={9} style={{width: 50}} />
                      </Form.Item>
                      {'×'}
                      <Form.Item
                        {...restField}
                        name={[name, 'color']}
                        style={{display: 'inline-block', marginBottom: 0}}
                      >
                        <PaintCascader paints={colors} />
                      </Form.Item>
                      {fields.length > 1 && (
                        <Button
                          shape="circle"
                          icon={<MinusOutlined />}
                          onClick={() => remove(name)}
                        />
                      )}
                    </Space>
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
                        disabled={!paintMixes.some(isThickConsistency)}
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

          <Space direction="vertical" size="small">
            {paintMixes.map((paintMix: PaintMix) => (
              <PaintMixDescription
                key={paintMix.id}
                paintMix={paintMix}
                showPaints={isThickConsistency(paintMix)}
                showConsistency={!isThickConsistency(paintMix)}
              />
            ))}
          </Space>
        </Space>
      </div>
      <ReflectanceChartDrawer
        paintMix={paintMixes.find(isThickConsistency)}
        open={isOpenReflectanceChart}
        onClose={() => setIsOpenReflectanceChart(false)}
      />
    </>
  );
};
