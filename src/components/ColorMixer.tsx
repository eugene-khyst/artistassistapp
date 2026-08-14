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
import {
  type ColorId,
  type ColorMixture,
  filterColors,
  type Fraction,
  gcd,
  hexToRgb,
  isFullStrength,
  isMixable,
  isTransparentLayeringSupported,
  makeColorMixtures,
  MIXABLE_COLOR_TYPES,
  PAPER_WHITE_HEX,
  range,
} from '@eugene-khyst/artistassistapp-color-mixer';
import {Trans, useLingui} from '@lingui/react/macro';
import {Button, Col, Flex, Form, Row, Select, Space, Tooltip, Typography} from 'antd';
import type {DefaultOptionType as SelectOptionType} from 'antd/es/select';
import {Fragment, useEffect, useMemo, useState} from 'react';

import {AdCard} from '@/components/ad/AdCard';
import {UnderlayerColorPicker} from '@/components/color/UnderlayerColorPicker';
import {useColorSetReset} from '@/hooks/useColorSetReset';
import {useAppStore} from '@/stores/app-store';

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

const THICKNESSES = [
  [1, 2],
  [1, 4],
] as const satisfies readonly Fraction[];

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
  const [colorIds, setColorIds] = useState<ColorId[]>([]);
  const [ratio, setRatio] = useState<number[]>([]);
  const [isOpenReflectanceChart, setIsOpenReflectanceChart] = useState<boolean>(false);

  const colorSetRevision = useColorSetReset(colorIds, () => {
    setColorIds([]);
    setRatio([]);
  });

  const colors = useMemo(() => filterColors(colorSet?.colors, colorIds), [colorSet, colorIds]);

  const isMixableColorSet: boolean = !!colorSet && isMixable(colorSet.type);

  useEffect(() => {
    if (isMixableColorSet) {
      form.setFieldsValue(formInitialValues);
    }
  }, [colorSetRevision, isMixableColorSet, form]);

  const colorMixtures = useMemo<ColorMixture[]>(() => {
    if (!colorSet || !colors.length || colors.length !== ratio.length) {
      return [];
    }
    const [mixtures] = makeColorMixtures({
      type: colorSet.type,
      colors,
      ratios: [ratio],
      underlayerRgb: underlayerHex ? hexToRgb(underlayerHex) : null,
      surfaceRgb: hexToRgb(surfaceHex),
      consistencies: THICKNESSES,
    });
    return mixtures;
  }, [colorSet, colors, ratio, underlayerHex, surfaceHex]);

  const handleFormValuesChange = (
    _: Partial<ColorMixerForm>,
    {colors: selectedColors}: ColorMixerForm
  ) => {
    if (!colorSet || !selectedColors.length) {
      return;
    }
    const selectedColorIds: ColorId[] = [];
    let selectedRatio: number[] = [];
    selectedColors.forEach(({color: selectedColor, part}) => {
      if (!selectedColor || !part) {
        return;
      }
      selectedColorIds.push(selectedColor);
      selectedRatio.push(part);
    });
    if (selectedRatio.length >= 2) {
      const [part1, part2, ...otherParts] = selectedRatio;
      const divisor = gcd(part1!, part2!, ...otherParts);
      selectedRatio = selectedRatio.map((part: number): number => part / divisor);
    }
    setColorIds(selectedColorIds);
    setRatio(selectedRatio);
  };

  if (!colorSet || !isMixable(colorSet.type)) {
    return <EmptyColorSet supportedColorTypes={MIXABLE_COLOR_TYPES} />;
  }

  return (
    <>
      <Flex vertical gap="middle" className="u-tab-content">
        <Typography.Text strong>
          <Trans>Mix your colors in any proportions so you don&apos;t waste real paints</Trans>
        </Typography.Text>

        <Space size="middle" align="start" wrap>
          <Space orientation="vertical" size="small" className={styles['inputColumn']}>
            {isTransparentLayeringSupported(colorSet.type, true) && (
              <UnderlayerColorPicker
                underlayerHex={underlayerHex}
                setUnderlayerHex={setUnderlayerHex}
                surfaceHex={surfaceHex}
                setSurfaceHex={setSurfaceHex}
              />
            )}
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
                    title={
                      <Trans>
                        Select up to {MAX_COLORS} colors to mix and specify the part of each color
                        in the resulting mix
                      </Trans>
                    }
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
                            placeholder={<Trans>Select part</Trans>}
                            className={styles['ratioSelect']}
                          />
                        </Form.Item>
                        {'×'}
                        <Form.Item
                          {...restField}
                          name={[name, 'color']}
                          className={styles['colorFormItem']}
                        >
                          <ColorCascader disabledColorIds={colorIds} />
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
