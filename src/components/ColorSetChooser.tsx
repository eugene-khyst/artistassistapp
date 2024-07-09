/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AppstoreAddOutlined,
  DeleteOutlined,
  QuestionCircleOutlined,
  SaveOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import {
  App,
  Button,
  Col,
  Form,
  Input,
  notification,
  Popconfirm,
  Row,
  Space,
  Spin,
  Typography,
} from 'antd';
import {useEffect, useState} from 'react';

import {ColorSetSelect} from '~/src/components/color-set/ColorSetSelect';
import {useColorBrands, useColors, useStandardColorSets} from '~/src/hooks';
import type {ColorBrandDefinition, ColorSetDefinition, ColorType} from '~/src/services/color';
import {COLOR_MIXING, COLOR_TYPES} from '~/src/services/color';
import {colorSetToUrl} from '~/src/services/url';
import {useAppStore} from '~/src/stores/app-store';
import {TabKey} from '~/src/types';

import {Ad} from './ad/Ad';
import {ColorBrandSelect} from './color-set/ColorBrandSelect';
import {ColorSelect} from './color-set/ColorSelect';
import {ColorTypeSelect} from './color-set/ColorTypeSelect';
import {StandardColorSetCascader} from './color-set/StandardColorSetCascader';
import {ShareModal} from './share/ShareModal';

const MAX_COLORS = 36;
const CUSTOM_COLOR_SET = [0];

const formInitialValues: ColorSetDefinition = {
  id: 0,
  brands: [],
  colors: {},
};

export const ColorSetChooser: React.FC = () => {
  const importedColorSet = useAppStore(state => state.importedColorSet);
  const latestColorSet = useAppStore(state => state.latestColorSet);
  const isInitialStateLoading = useAppStore(state => state.isInitialStateLoading);
  const colorSetsByType = useAppStore(state => state.colorSetsByType);

  const setActiveTabKey = useAppStore(state => state.setActiveTabKey);
  const loadColorSetsByType = useAppStore(state => state.loadColorSetsByType);
  const saveColorSet = useAppStore(state => state.saveColorSet);
  const deleteColorSet = useAppStore(state => state.deleteColorSet);

  const {message} = App.useApp();
  const [api, contextHolder] = notification.useNotification();

  const [form] = Form.useForm<ColorSetDefinition>();
  const selectedType = Form.useWatch<ColorType | undefined>('type', form);
  const selectedColorSetId = Form.useWatch<number | undefined>('id', form);
  const selectedBrandIds = Form.useWatch<number[] | undefined>('brands', form);
  const selectedColors = Form.useWatch<Record<number, number[] | undefined> | undefined>(
    'colors',
    form
  );

  const selectedColorsCount: number = Object.values(selectedColors || {})
    .map((ids: number[] | undefined) => ids?.length ?? 0)
    .reduce((a: number, b: number) => a + b, 0);

  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [shareColorSetUrl, setShareColorSetUrl] = useState<string>();

  useEffect(() => {
    const colorSet: ColorSetDefinition | null = importedColorSet || latestColorSet;
    if (colorSet) {
      form.setFieldsValue(colorSet);
    }
  }, [form, importedColorSet, latestColorSet]);

  const {brands, isLoading: isBrandsLoading, isError: isBrandsError} = useColorBrands(selectedType);

  const selectedBrands: ColorBrandDefinition[] | undefined = selectedBrandIds
    ?.map((id: number) => brands?.get(id))
    .filter((brand): brand is ColorBrandDefinition => !!brand);

  const selectedBrandAliases: string[] | undefined = selectedBrands?.map(brand => brand.alias);

  const {
    standardColorSets,
    isLoading: isStandardColorSetsLoading,
    isError: isStandardColorSetsError,
  } = useStandardColorSets(selectedType, selectedBrandAliases);

  const {
    colors,
    isLoading: isColorsLoading,
    isError: isColorsError,
  } = useColors(selectedType, selectedBrandAliases);

  const isLoading: boolean =
    isInitialStateLoading || isBrandsLoading || isStandardColorSetsLoading || isColorsLoading;

  useEffect(() => {
    if (isBrandsError) {
      api.error({
        message: 'Error while fetching color brand data',
        placement: 'top',
        duration: 0,
      });
    }
  }, [isBrandsError, api]);

  useEffect(() => {
    if (isStandardColorSetsError) {
      api.error({
        message: 'Error while fetching standard color set data',
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

  const handleFormValuesChange = (
    changedValues: Partial<ColorSetDefinition>,
    values: ColorSetDefinition
  ) => {
    void (async () => {
      const emptyColors: Partial<Record<number, number[]>> = values.colors
        ? Object.fromEntries(Object.keys(values.colors).map((brand: string) => [brand, []]))
        : {};

      if (changedValues.type) {
        form.setFieldsValue({
          id: 0,
          name: undefined,
          brands: [],
          standardColorSet: undefined,
          colors: emptyColors,
        });

        const [latestColorSetsByType]: ColorSetDefinition[] = await loadColorSetsByType(
          changedValues.type
        );
        if (latestColorSetsByType) {
          form.setFieldsValue(latestColorSetsByType);
        }
      }

      if ((changedValues.id ?? -1) >= 0) {
        form.setFieldsValue({
          id: 0,
          name: undefined,
          brands: [],
          standardColorSet: undefined,
          colors: emptyColors,
        });

        if (changedValues.id! > 0) {
          const colorSet: ColorSetDefinition | undefined = colorSetsByType.find(
            ({id}: ColorSetDefinition) => id === changedValues.id
          );
          if (colorSet) {
            form.setFieldsValue(colorSet);
          }
        }
      }

      if (changedValues.brands) {
        const [standardColorSetBrand] = values.standardColorSet || [];
        const standardColorSet: ColorSetDefinition['standardColorSet'] =
          standardColorSetBrand && !values.brands.includes(standardColorSetBrand)
            ? undefined
            : values.standardColorSet;

        const colors: Partial<Record<number, number[]>> = {...emptyColors};
        if (values.brands && values.colors) {
          values.brands.forEach((brand: number) => {
            colors[brand] = values.colors[brand] || [];
          });
        }

        form.setFieldsValue({
          standardColorSet,
          colors,
        });
      }

      if (changedValues.standardColorSet) {
        const [brandId, name] = changedValues.standardColorSet;
        if (brandId && name) {
          const brandAlias: string | undefined = brands?.get(brandId)?.alias;
          if (brandAlias) {
            const colors: Partial<Record<number, number[]>> = {...emptyColors};
            colors[brandId] = standardColorSets.get(brandAlias)?.get(name)?.colors || [];

            form.setFieldsValue({
              colors,
            });
          }
        }
      }

      if (changedValues.colors) {
        form.setFieldsValue({
          standardColorSet: CUSTOM_COLOR_SET,
        });
      }
    })();
  };

  const handleSubmit = async (values: ColorSetDefinition) => {
    const colorSet: ColorSetDefinition | undefined = await saveColorSet(values, brands, colors);
    if (colorSet) {
      form.setFieldsValue(colorSet);
    }
  };

  const handleSubmitFailed = () => {
    void message.error('Fill in the required fields');
  };

  const handleDeleteButtonClick = async () => {
    if (selectedColorSetId) {
      await deleteColorSet(selectedColorSetId);
      let values: Partial<ColorSetDefinition> = {
        type: selectedType,
      };
      if (selectedType) {
        const [latestColorSetsByType] = await loadColorSetsByType(selectedType);
        values = latestColorSetsByType ?? values;
      }
      form.resetFields();
      form.setFieldsValue(values);
    }
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
                <strong>ArtistAssistApp</strong> is a free web app for artists to accurately mix any
                color from a photo, analyze tonal values, turn a photo into an outline, draw with
                the grid method, paint with a limited palette, simplify a photo, and more.
              </Typography.Text>
              <Space size="small">
                <Button
                  icon={<AppstoreAddOutlined />}
                  type="primary"
                  onClick={() => void setActiveTabKey(TabKey.Install)}
                >
                  Install
                </Button>
                <Button
                  icon={<QuestionCircleOutlined />}
                  onClick={() => void setActiveTabKey(TabKey.Help)}
                >
                  Help
                </Button>
              </Space>
            </Space>
          </Col>
          <Col xs={24} md={12} lg={10}>
            <Ad tab={TabKey.ColorSet} />
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
            onFinish={values => void handleSubmit(values)}
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
            {!!selectedType && (
              <Form.Item
                name="id"
                label="Color set"
                tooltip={`Select from your recent ${COLOR_TYPES.get(selectedType)?.name.toLowerCase()} color sets.`}
                rules={[{required: true, message: '${label} is required'}]}
                dependencies={['type']}
              >
                <ColorSetSelect colorSets={colorSetsByType} brands={brands} />
              </Form.Item>
            )}
            {!!selectedType && (selectedColorSetId ?? -1) >= 0 && (
              <>
                <Form.Item
                  name="name"
                  label="Name"
                  tooltip="Give your color set a name for easy access."
                  dependencies={['type']}
                >
                  <Input placeholder="Name a color set" />
                </Form.Item>
                <Form.Item
                  name="brands"
                  label="Brands"
                  tooltip={`Select ${COLOR_TYPES.get(selectedType)?.name.toLowerCase()} brands that you use.`}
                  rules={[{required: true, message: '${label} are required'}]}
                  dependencies={['type']}
                >
                  <ColorBrandSelect mode="multiple" brands={brands} />
                </Form.Item>
              </>
            )}
            {!!selectedBrandIds?.length && (
              <Form.Item
                name="standardColorSet"
                label="Set"
                rules={[{required: true, message: '${label} is required'}]}
                dependencies={['type', 'brands']}
                tooltip="Do you have a store-bought or custom color set?"
              >
                <StandardColorSetCascader
                  brands={selectedBrands}
                  standardColorSets={standardColorSets}
                />
              </Form.Item>
            )}
            {!!selectedType &&
              selectedBrands?.map((brand: ColorBrandDefinition) => (
                <Form.Item
                  key={brand.id}
                  name={['colors', brand.id.toString()]}
                  label={`${brand.fullName} colors`}
                  rules={[
                    {required: true, message: '${label} are required'},
                    ({getFieldValue}) => ({
                      validator() {
                        const type = getFieldValue('type') as ColorType | undefined;
                        const colors = getFieldValue('colors') as
                          | Record<number, number[] | undefined>
                          | undefined;
                        if (!type || !colors) {
                          return Promise.resolve();
                        }
                        const {maxColors} = COLOR_MIXING[type];
                        if (maxColors === 1) {
                          return Promise.resolve();
                        }
                        const totalColors = Object.values(colors)
                          .map((ids: number[] | undefined) => ids?.length ?? 0)
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
                  dependencies={['type', 'brands', 'standardColorSet']}
                  tooltip="Add or remove colors to match your actual color set."
                >
                  <ColorSelect mode="multiple" colors={colors.get(brand.alias)} brand={brand} />
                </Form.Item>
              ))}
            <Form.Item>
              <Space wrap>
                <Button icon={<SaveOutlined />} type="primary" htmlType="submit">
                  Save & proceed
                </Button>
                {!!selectedColorSetId && (
                  <Popconfirm
                    title="Delete the color set"
                    description="Are you sure you want to delete this color set?"
                    onPopupClick={e => e.stopPropagation()}
                    onConfirm={e => {
                      e?.stopPropagation();
                      void handleDeleteButtonClick();
                    }}
                    onCancel={e => e?.stopPropagation()}
                    okText="Yes"
                    cancelText="No"
                  >
                    <Button icon={<DeleteOutlined />} onClick={e => e.stopPropagation()}>
                      Delete
                    </Button>
                  </Popconfirm>
                )}
                {selectedColorsCount > 0 && (
                  <Button
                    icon={<ShareAltOutlined />}
                    title="Share this color set"
                    onClick={showShareModal}
                  >
                    Share
                  </Button>
                )}
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
