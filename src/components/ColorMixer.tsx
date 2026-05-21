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
  LineChartOutlined,
  MinusOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import {Trans, useLingui} from '@lingui/react/macro';
import {Button, Col, Flex, Form, Row, Select, Space, Tooltip, Typography} from 'antd';
import type {DefaultOptionType as SelectOptionType} from 'antd/es/select';
import {Fragment, useEffect, useMemo, useState} from 'react';

import {AdCard} from '~/src/components/ad/AdCard';
import {UnderlayerColorPicker} from '~/src/components/color/UnderlayerColorPicker';
import {
  compareColorMixturesByConsistency,
  FRACTIONS,
  isFullStrength,
  isMixable,
  makeColorMixture,
  MIXABLE_COLOR_TYPES,
  PAPER_WHITE_HEX,
} from '~/src/services/color/color-mixer';
import {hexToRgb} from '~/src/services/color/space/rgb';
import type {Color, ColorMixture} from '~/src/services/color/types';
import {gcd} from '~/src/services/math/gcd';
import {useAppStore} from '~/src/stores/app-store';
import {range} from '~/src/utils/array';

import {AddToPaletteButton} from './color/AddToPaletteButton';
import {ColorMixtureDescription} from './color/ColorMixtureDescription';
import {ReflectanceChartDrawer} from './color/ReflectanceChartDrawer';
import {ColorCascader} from './color-set/ColorCascader';
import styles from './ColorMixer.module.css';
import {EmptyColorSet} from './empty/EmptyColorSet';

interface ColorMixerForm {
  colors: {
    color?: [number, number];
    part?: number;
  }[];
}

const MAX_COLORS = 4;

const ratioOptions: SelectOptionType[] = range(1, 9).map((part: number) => ({
  value: part,
  label: part,
}));

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

export function ColorMixer() {
  const colorSet = useAppStore(state => state.colorSet);

  const {t} = useLingui();

  const [form] = Form.useForm();

  const [underlayerHex, setUnderlayerHex] = useState<string | null>(null);
  const [surfaceHex, setSurfaceHex] = useState<string>(PAPER_WHITE_HEX);
  const [colors, setColors] = useState<Color[]>([]);
  const [ratio, setRatio] = useState<number[]>([]);
  const [isOpenReflectanceChart, setIsOpenReflectanceChart] = useState<boolean>(false);

  useEffect(() => {
    if (colorSet && isMixable(colorSet.type)) {
      form.setFieldsValue(formInitialValues);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setColors([]);

      setRatio([]);
    }
  }, [colorSet, form]);

  const colorMixtures = useMemo<ColorMixture[]>(() => {
    if (!colorSet || !colors.length || colors.length !== ratio.length) {
      return [];
    }
    return makeColorMixture(
      colorSet.type,
      colors,
      ratio,
      underlayerHex ? hexToRgb(underlayerHex) : null,
      hexToRgb(surfaceHex),
      FRACTIONS
    ).sort(compareColorMixturesByConsistency);
  }, [colorSet, colors, ratio, underlayerHex, surfaceHex]);

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

  if (!colorSet || !isMixable(colorSet.type)) {
    return <EmptyColorSet supportedColorTypes={MIXABLE_COLOR_TYPES} />;
  }

  return (
    <>
      <Flex vertical gap="middle" className="u-tab-content">
        <Typography.Text strong>
          <Trans>Mix your colors in any proportions so you don&apos;t waste real paints.</Trans>
        </Typography.Text>

        <Space size="middle" align="start" wrap>
          <Space orientation="vertical" size="small" className={styles['inputColumn']}>
            <UnderlayerColorPicker
              underlayerHex={underlayerHex}
              setUnderlayerHex={setUnderlayerHex}
              surfaceHex={surfaceHex}
              setSurfaceHex={setSurfaceHex}
            />
            <Form
              name="colorMixture"
              form={form}
              initialValues={formInitialValues}
              onValuesChange={handleFormValuesChange}
              requiredMark={false}
              autoComplete="off"
            >
              <Form.Item className="u-mb-0">
                <Flex gap="small" align="center">
                  <Typography.Text className={styles['ratioLabel']}>
                    <Trans>Ratio</Trans>
                  </Typography.Text>
                  <Typography.Text>×</Typography.Text>
                  <Typography.Text>
                    <Trans>Color</Trans>
                  </Typography.Text>
                  <Tooltip
                    title={t`Select any number of colors to mix and specify the part of each color in the resulting mix.`}
                  >
                    <QuestionCircleOutlined className="u-help-icon" />
                  </Tooltip>
                </Flex>
              </Form.Item>
              <Form.List name="colors">
                {(fields, {add, remove}) => (
                  <>
                    {fields.map(({key, name, ...restField}) => (
                      <Flex key={key} gap="small" align="center" className={styles['colorRow']}>
                        <Form.Item {...restField} name={[name, 'part']} className="u-mb-0">
                          <Select
                            options={ratioOptions}
                            placeholder={t`Select part`}
                            className={styles['ratioSelect']}
                          />
                        </Form.Item>
                        {'×'}
                        <Form.Item
                          {...restField}
                          name={[name, 'color']}
                          className={styles['colorFormItem']}
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
                    <Space>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        disabled={fields.length >= MAX_COLORS}
                        onClick={() => {
                          add(defaultValue);
                        }}
                      >
                        <Trans>Add color</Trans>
                      </Button>
                      <Button
                        icon={<LineChartOutlined />}
                        title={t`Spectral reflectance curve`}
                        disabled={!colorMixtures.some(isFullStrength)}
                        onClick={() => {
                          setIsOpenReflectanceChart(true);
                        }}
                      >
                        <Trans>Reflectance</Trans>
                      </Button>
                    </Space>
                  </>
                )}
              </Form.List>
            </Form>
          </Space>

          <Space orientation="vertical">
            {colorMixtures.map((colorMixture: ColorMixture) => (
              <Fragment key={colorMixture.key}>
                <ColorMixtureDescription
                  colorMixture={colorMixture}
                  showColors={isFullStrength(colorMixture)}
                  showConsistency={!isFullStrength(colorMixture)}
                />
                <AddToPaletteButton
                  colorMixture={colorMixture}
                  linkToImage={false}
                  size="small"
                  className="u-mb-xs"
                />
              </Fragment>
            ))}
          </Space>
        </Space>

        <Row justify="start">
          <Col xs={24} md={12}>
            <AdCard />
          </Col>
        </Row>
      </Flex>
      <ReflectanceChartDrawer
        colorMixture={colorMixtures.find(isFullStrength)}
        open={isOpenReflectanceChart}
        onClose={() => {
          setIsOpenReflectanceChart(false);
        }}
      />
    </>
  );
}
