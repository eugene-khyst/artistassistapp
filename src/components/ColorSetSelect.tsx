/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  PlayCircleOutlined,
  QuestionCircleOutlined,
  SaveOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import {
  App,
  Button,
  Col,
  ConfigProvider,
  Form,
  notification,
  Row,
  Space,
  Spin,
  Typography,
} from 'antd';
import {useEffect, useState} from 'react';

import {appConfig} from '~/src/config';
import {useColors, useStandardColorSets} from '~/src/hooks';
import type {AdsDefinition} from '~/src/services/ads';
import type {ColorBrand, ColorSetDefinition, ColorType} from '~/src/services/color';
import {
  COLOR_BRANDS,
  COLOR_MIXING,
  COLOR_TYPES,
  colorSetToUrl,
  toColorSet,
} from '~/src/services/color';
import {getColorSetByType, getLastColorSet, saveColorSet} from '~/src/services/db';
import {importedFromUrl, useAppStore} from '~/src/stores/app-store';
import {TabKey} from '~/src/types';

import {Ad} from './ad/Ad';
import {ColorBrandSelect} from './color/ColorBrandSelect';
import {ColorSelect} from './color/ColorSelect';
import {ColorTypeSelect} from './color/ColorTypeSelect';
import {StandardColorSetCascader} from './color/StandardColorSetCascader';
import {ShareModal} from './modal/ShareModal';

const MAX_COLORS = 36;
const CUSTOM_COLOR_SET = [0];

const formInitialValues: ColorSetDefinition = {
  brands: [],
  colors: {},
};

type Props = {
  ads?: AdsDefinition;
};

export const ColorSetSelect: React.FC<Props> = ({ads}: Props) => {
  const setActiveTabKey = useAppStore(state => state.setActiveTabKey);
  const setColorSet = useAppStore(state => state.setColorSet);

  const {quickStartUrl} = appConfig;

  const {message} = App.useApp();
  const [api, contextHolder] = notification.useNotification();

  const [form] = Form.useForm<ColorSetDefinition>();
  const colorType = Form.useWatch<ColorType | undefined>('type', form);
  const colorBrands = Form.useWatch<ColorBrand[] | undefined>('brands', form);

  const [isColorSetLoading, setIsColorSetLoading] = useState<boolean>(false);

  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [shareColorSetUrl, setShareColorSetUrl] = useState<string>();

  useEffect(() => {
    void (async () => {
      setIsColorSetLoading(true);
      const {colorSet: importedColorSet} = importedFromUrl;
      if (importedColorSet) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('Importing color set', importedColorSet);
        }
        form.setFieldsValue(importedColorSet);
      } else {
        const lastColorSet: ColorSetDefinition | undefined = await getLastColorSet();
        if (lastColorSet) {
          form.setFieldsValue(lastColorSet);
        }
      }
      setIsColorSetLoading(false);
    })();
  }, [form]);

  const {
    standardColorSets,
    isLoading: isStandardColorSetsLoading,
    isError: isStandardColorSetsError,
  } = useStandardColorSets(colorType, colorBrands);

  const {
    colors,
    isLoading: isColorsLoading,
    isError: isColorsError,
  } = useColors(colorType, colorBrands);

  const isLoading: boolean = isColorSetLoading || isStandardColorSetsLoading || isColorsLoading;

  useEffect(() => {
    if (isStandardColorSetsError) {
      api.error({
        message: 'Error while fetching set data',
        placement: 'top',
        duration: 0,
      });
    }
  }, [isStandardColorSetsError, api]);

  useEffect(() => {
    if (isColorsError) {
      api.error({
        message: 'Error while fetching color data',
        placement: 'top',
        duration: 0,
      });
    }
  }, [isColorsError, api]);

  const handleHelpButtonClick = () => {
    setActiveTabKey(TabKey.Help);
  };

  const handleFormValuesChange = (
    changedValues: Partial<ColorSetDefinition>,
    values: ColorSetDefinition
  ) => {
    void (async () => {
      const emptyColors: Partial<Record<ColorBrand, number[]>> = values.colors
        ? Object.fromEntries(Object.keys(values.colors).map((brand: string) => [brand, []]))
        : {};

      if (changedValues.type) {
        form.setFieldsValue({
          brands: [],
          standardColorSet: undefined,
          colors: emptyColors,
        });

        const valuesFromDb: ColorSetDefinition | undefined = await getColorSetByType(
          changedValues.type
        );
        if (valuesFromDb) {
          form.setFieldsValue(valuesFromDb);
        }
      }

      if (changedValues.brands) {
        const [standardColorSetBrand] = values.standardColorSet || [undefined];
        const standardColorSet: ColorSetDefinition['standardColorSet'] =
          standardColorSetBrand && !values.brands.includes(standardColorSetBrand)
            ? undefined
            : values.standardColorSet;

        const colors: Partial<Record<ColorBrand, number[]>> = {...emptyColors};
        if (values.brands && values.colors) {
          values.brands.forEach((brand: ColorBrand) => {
            colors[brand] = values.colors[brand] || [];
          });
        }

        form.setFieldsValue({
          standardColorSet: standardColorSet,
          colors,
        });
      }

      const [changedStandardColorSetBrand, changedStandardColorSetName] =
        changedValues.standardColorSet || [undefined, undefined];
      if (changedStandardColorSetBrand && changedStandardColorSetName) {
        const colors: Partial<Record<ColorBrand, number[]>> = {...emptyColors};
        colors[changedStandardColorSetBrand] =
          standardColorSets.get(changedStandardColorSetBrand)?.get(changedStandardColorSetName)
            ?.colors || [];

        form.setFieldsValue({
          colors,
        });
      }

      if (changedValues.colors) {
        form.setFieldsValue({standardColorSet: CUSTOM_COLOR_SET});
      }
    })();
  };

  const handleSubmit = (values: ColorSetDefinition) => {
    void saveColorSet(values);
    void setColorSet(toColorSet(values, colors));
  };

  const handleSubmitFailed = () => {
    void message.error('Fill in the required fields');
  };

  const showShareModal = () => {
    setShareColorSetUrl(colorSetToUrl(form.getFieldsValue()));
    setIsShareModalOpen(true);
  };

  return (
    <>
      {contextHolder}
      <div style={{padding: '0 16px'}}>
        <Row gutter={[16, 16]} style={{marginBottom: 16}}>
          <Col xs={24} md={12} lg={14}>
            <Space direction="vertical" size="small">
              <Typography.Text>
                <strong>ArtistAssistApp</strong> is a painting and drawing assistant web app that
                allows you to see the reference more clearly and mix colors more accurately.
              </Typography.Text>
              <Space size="small">
                <ConfigProvider
                  theme={{
                    token: {
                      colorPrimary: '#00b96b',
                    },
                  }}
                >
                  <Button
                    icon={<PlayCircleOutlined />}
                    type="primary"
                    href={quickStartUrl}
                    target="_blank"
                  >
                    Quick start video
                  </Button>
                </ConfigProvider>
                <Button icon={<QuestionCircleOutlined />} onClick={handleHelpButtonClick}>
                  Help
                </Button>
              </Space>
            </Space>
          </Col>
          <Col xs={24} md={12} lg={10}>
            <Ad ads={ads} tab={TabKey.ColorSet} />
          </Col>
        </Row>
        <Typography.Text strong>
          Select your medium, color brands and colors you will paint with and press the{' '}
          <Typography.Text code>Save & proceed</Typography.Text> button. The maximum number of
          colors for paints is {MAX_COLORS}, for pencils – unlimited.
        </Typography.Text>
        <Spin spinning={isLoading} tip="Loading" size="large">
          <Form
            name="colorSet"
            form={form}
            initialValues={formInitialValues}
            onValuesChange={handleFormValuesChange}
            onFinish={handleSubmit}
            onFinishFailed={handleSubmitFailed}
            layout="vertical"
            requiredMark="optional"
            autoComplete="off"
          >
            <Form.Item
              name="type"
              label="Medium"
              rules={[{required: true, message: '${label} is required'}]}
            >
              <ColorTypeSelect />
            </Form.Item>
            {!!colorType && (
              <Form.Item
                name="brands"
                label="Brands"
                tooltip={`Select ${COLOR_TYPES.get(colorType)?.name.toLowerCase()} brands that you use.`}
                rules={[{required: true, message: '${label} are required'}]}
                dependencies={['colorType']}
              >
                <ColorBrandSelect mode="multiple" type={colorType} />
              </Form.Item>
            )}
            {!!colorBrands?.length && (
              <Form.Item
                name="standardColorSet"
                label="Set"
                rules={[{required: true, message: '${label} is required'}]}
                dependencies={['colorType', 'colorBrands']}
                tooltip="Do you have a store-bought or custom color set?"
              >
                <StandardColorSetCascader type={colorType} standardColorSets={standardColorSets} />
              </Form.Item>
            )}
            {!!colorType &&
              colorBrands?.map((colorBrand: ColorBrand) => (
                <Form.Item
                  key={colorBrand}
                  name={['colors', colorBrand.toString()]}
                  label={`${COLOR_BRANDS.get(colorType)?.get(colorBrand)?.fullName} colors`}
                  rules={[
                    {required: true, message: '${label} are required'},
                    ({getFieldValue}) => ({
                      validator() {
                        const colorType = getFieldValue('type') as ColorType;
                        const {maxColors} = COLOR_MIXING[colorType];
                        if (maxColors === 1) {
                          return Promise.resolve();
                        }
                        const colors = getFieldValue('colors') as Record<ColorBrand, number[]>;
                        const totalColors = Object.values(colors)
                          .map((ids: number[]) => ids.length)
                          .reduce((a: number, b: number) => a + b, 0);
                        if (totalColors > MAX_COLORS) {
                          return Promise.reject(
                            `A total of ${MAX_COLORS} colors of all brands are allowed`
                          );
                        } else {
                          return Promise.resolve();
                        }
                      },
                    }),
                  ]}
                  dependencies={['colorType', 'colorBrands', 'standardColorSet']}
                  tooltip="Add or remove colors to match your actual color set."
                >
                  <ColorSelect mode="multiple" colors={colors.get(colorBrand)} />
                </Form.Item>
              ))}
            <Form.Item>
              <Space>
                <Button icon={<SaveOutlined />} type="primary" htmlType="submit">
                  Save & proceed
                </Button>
                <Button
                  icon={<ShareAltOutlined />}
                  title="Share this color set"
                  onClick={showShareModal}
                >
                  Share
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Spin>
      </div>
      <ShareModal
        title="Share your color set"
        open={isShareModalOpen}
        setOpen={setIsShareModalOpen}
        url={shareColorSetUrl}
      />
    </>
  );
};
