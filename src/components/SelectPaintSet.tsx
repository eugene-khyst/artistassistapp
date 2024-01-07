/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {ShareAltOutlined} from '@ant-design/icons';
import {App, Button, Cascader, Form, Select, SelectProps, Space, Spin, Typography} from 'antd';
import {DefaultOptionType as SelectOptionType} from 'antd/es/select';
import {Dispatch, ReactElement, SetStateAction, useEffect, useState} from 'react';
import {usePaints, useStoreBoughtPaintSets} from '../hooks';
import {
  NUMBER_OF_PAINTS_IN_MIX,
  PAINT_BRANDS,
  PAINT_BRAND_LABELS,
  PAINT_TYPE_LABELS,
  Paint,
  PaintBrand,
  PaintSet,
  PaintSetDefinition,
  PaintType,
  StoreBoughtPaintSet,
  formatPaintId,
  paintSetToUrl,
  toPaintSet,
} from '../services/color';
import {getLastPaintSet, getPaintSetByType, savePaintSet} from '../services/db';
import {maxInMap} from '../utils';
import {ColorSquare} from './color/ColorSquare';
import {ShareModal} from './modal/ShareModal';
import {CascaderOption} from './types';

const MAX_COLORS = 36;

const PAINT_TYPE_OPTIONS: SelectProps['options'] = Object.entries(PAINT_TYPE_LABELS).map(
  ([key, label]: [string, string]) => ({
    value: Number(key),
    label,
  })
);

const customPaintSet = [0];

const customPaintSetOption = {
  value: 0,
  label: 'Custom paint set',
};

function getPaintBrandOptions(type?: PaintType): SelectProps['options'] {
  if (!type) {
    return [];
  }
  return PAINT_BRANDS[type].map((paintBrand: PaintBrand) => ({
    value: paintBrand,
    label: PAINT_BRAND_LABELS[type][paintBrand]?.fullText,
  }));
}

function getStoreBoughtPaintSetOptions(
  type: PaintType | undefined,
  storeBoughtPaintSets: Map<PaintBrand, Map<string, StoreBoughtPaintSet>>
): CascaderOption[] {
  if (!type || !storeBoughtPaintSets.size) {
    return [];
  }
  return [
    customPaintSetOption,
    ...[...storeBoughtPaintSets.entries()].map(
      ([brand, storeBoughtPaintSets]: [PaintBrand, Map<string, StoreBoughtPaintSet>]) => ({
        value: brand,
        label: PAINT_BRAND_LABELS[type][brand]?.fullText,
        children: [...storeBoughtPaintSets.values()].map(({name}: StoreBoughtPaintSet) => ({
          value: name,
          label: name,
        })),
      })
    ),
  ];
}

function getPaintOptions(
  paints: Map<PaintBrand, Map<number, Paint>>
): Partial<Record<PaintBrand, SelectProps['options']>> {
  if (!paints.size) {
    return {};
  }
  return Object.fromEntries(
    [...paints.entries()].map(([brand, paints]: [PaintBrand, Map<number, Paint>]) => {
      const maxId: number = maxInMap(paints, ({id}: Paint) => id);
      return [
        brand,
        [...paints.values()].map((paint: Paint) => {
          const {id, rgb} = paint;
          const label: string = formatPaintId(paint, maxId);
          return {
            value: id,
            label: (
              <Space size="small" align="center" key={label}>
                <ColorSquare color={rgb} />
                <span>{label}</span>
              </Space>
            ),
          };
        }),
      ];
    })
  );
}

const filterSelectOptions = (inputValue: string, option?: SelectOptionType): boolean => {
  if (!option?.label) {
    return false;
  }
  const searchTerm: string = inputValue.toLowerCase();
  if (typeof option.label === 'string') {
    return option.label.toLowerCase().includes(searchTerm);
  }
  const label = option.label as ReactElement;
  const key: string | undefined = label.key?.toString()?.toLowerCase();
  return key?.includes(searchTerm) ?? false;
};

const filterCascaderOptions = (inputValue: string, path: CascaderOption[]) =>
  path.some(option => (option.label as string).toLowerCase().includes(inputValue.toLowerCase()));

const formInitialValues: PaintSetDefinition = {
  brands: [],
  colors: {},
};

type Props = {
  setPaintSet: Dispatch<SetStateAction<PaintSet | undefined>>;
  importedPaintSet?: PaintSetDefinition;
};

export const SelectPaintSet: React.FC<Props> = ({setPaintSet, importedPaintSet}: Props) => {
  const {message} = App.useApp();
  const [form] = Form.useForm<PaintSetDefinition>();
  const paintType = Form.useWatch<PaintType | undefined>('type', form);
  const paintBrands = Form.useWatch<PaintBrand[] | undefined>('brands', form);

  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [sharePaintSetUrl, setSharePaintSetUrl] = useState<string>();

  useEffect(() => {
    (async () => {
      if (importedPaintSet) {
        form.setFieldsValue(importedPaintSet);
      } else {
        const lastPaintSet: PaintSetDefinition | undefined = await getLastPaintSet();
        if (lastPaintSet) {
          form.setFieldsValue(lastPaintSet);
        }
      }
    })();
  }, [form, importedPaintSet]);

  const {
    storeBoughtPaintSets,
    isLoading: isStoreBoughtPaintSetsLoading,
    isError: isStoreBoughtPaintSetError,
  } = useStoreBoughtPaintSets(paintType, paintBrands);

  const {
    paints,
    isLoading: isPaintsLoading,
    isError: isPaintsError,
  } = usePaints(paintType, paintBrands);

  const isLoading: boolean = isStoreBoughtPaintSetsLoading || isPaintsLoading;

  if (isStoreBoughtPaintSetError || isPaintsError) {
    message.error('Error while fetching data');
  }

  const paintBrandOptions = getPaintBrandOptions(paintType);
  const storeBoughtPaintSetOptions = getStoreBoughtPaintSetOptions(paintType, storeBoughtPaintSets);
  const paintOptions = getPaintOptions(paints);

  const handleFormValuesChange = async (
    changedValues: Partial<PaintSetDefinition>,
    values: PaintSetDefinition
  ) => {
    const emptyColors: Partial<Record<PaintBrand, number[]>> = values.colors
      ? Object.fromEntries(Object.keys(values.colors).map((brand: string) => [brand, []]))
      : {};

    if (changedValues.type) {
      form.setFieldsValue({
        brands: [],
        storeBoughtPaintSet: undefined,
        colors: emptyColors,
      });

      const valuesFromDb: PaintSetDefinition | undefined = await getPaintSetByType(
        changedValues.type
      );
      if (valuesFromDb) {
        form.setFieldsValue(valuesFromDb);
      }
    }

    if (changedValues.brands) {
      const [storeBoughtPaintSetBrand] = values.storeBoughtPaintSet || [undefined];
      const storeBoughtPaintSet: PaintSetDefinition['storeBoughtPaintSet'] =
        storeBoughtPaintSetBrand && !values.brands.includes(storeBoughtPaintSetBrand)
          ? undefined
          : values.storeBoughtPaintSet;

      const colors: Partial<Record<PaintBrand, number[]>> = {...emptyColors};
      if (values.brands && values.colors) {
        values.brands.forEach((brand: PaintBrand) => {
          colors[brand] = values.colors[brand] || [];
        });
      }

      form.setFieldsValue({
        storeBoughtPaintSet,
        colors,
      });
    }

    const [changedStoreBoughtPaintSetBrand, changedStoreBoughtPaintSetName] =
      changedValues.storeBoughtPaintSet || [undefined, undefined];
    if (changedStoreBoughtPaintSetBrand && changedStoreBoughtPaintSetName) {
      const colors: Partial<Record<PaintBrand, number[]>> = {...emptyColors};
      colors[changedStoreBoughtPaintSetBrand] =
        storeBoughtPaintSets
          .get(changedStoreBoughtPaintSetBrand)
          ?.get(changedStoreBoughtPaintSetName)?.colors || [];

      form.setFieldsValue({
        colors,
      });
    }

    if (changedValues.colors) {
      form.setFieldsValue({storeBoughtPaintSet: customPaintSet});
    }
  };

  const handleSubmit = (values: PaintSetDefinition) => {
    savePaintSet(values);
    const paintSet: PaintSet = toPaintSet(values, paints);
    setPaintSet(paintSet);
  };

  const handleSubmitFailed = () => {
    message.error('Form validation error');
  };

  const showShareModal = () => {
    setSharePaintSetUrl(paintSetToUrl(form.getFieldsValue()));
    setIsShareModalOpen(true);
  };

  return (
    <>
      <div style={{padding: '0 16px'}}>
        <Typography.Title level={3} style={{marginTop: '0.5em'}}>
          Select paint set
        </Typography.Title>
        <Spin spinning={isLoading} tip="Loading" size="large" delay={300}>
          <Form
            name="paintSet"
            form={form}
            initialValues={formInitialValues}
            onValuesChange={handleFormValuesChange}
            onFinish={handleSubmit}
            onFinishFailed={handleSubmitFailed}
            layout="vertical"
            size="large"
            requiredMark="optional"
            autoComplete="off"
          >
            <Form.Item
              name="type"
              label="Medium"
              rules={[{required: true, message: '${label} is required'}]}
            >
              <Select options={PAINT_TYPE_OPTIONS} placeholder="Select medium" />
            </Form.Item>
            {!!paintType && (
              <Form.Item
                name="brands"
                label="Brands"
                rules={[{required: true, message: '${label} are required'}]}
                dependencies={['paintType']}
              >
                <Select
                  mode="multiple"
                  options={paintBrandOptions}
                  placeholder="Select brands"
                  showSearch
                  filterOption={filterSelectOptions}
                  allowClear
                />
              </Form.Item>
            )}
            {!!paintBrands?.length && (
              <Form.Item
                name="storeBoughtPaintSet"
                label="Set"
                rules={[{required: true, message: '${label} is required'}]}
                dependencies={['paintType', 'paintBrands']}
                tooltip="Do you have a store-bought or custom set?"
              >
                <Cascader
                  options={storeBoughtPaintSetOptions}
                  placeholder="Select set"
                  showSearch={{filter: filterCascaderOptions}}
                  expandTrigger="hover"
                  allowClear
                />
              </Form.Item>
            )}
            {!!paintType &&
              paintBrands?.map((paintBrand: PaintBrand) => (
                <Form.Item
                  key={paintBrand}
                  name={['colors', paintBrand.toString()]}
                  label={`${PAINT_BRAND_LABELS[paintType][paintBrand]?.fullText} colors`}
                  rules={[
                    {required: true, message: '${label} are required'},
                    ({getFieldValue}) => ({
                      validator() {
                        const paintType = getFieldValue('type') as PaintType;
                        if (NUMBER_OF_PAINTS_IN_MIX[paintType] === 1) {
                          return Promise.resolve();
                        }
                        const colors = getFieldValue('colors') as Record<PaintBrand, number[]>;
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
                  dependencies={['paintType', 'paintBrands', 'storeBoughtPaintSet']}
                  tooltip="Add or remove colors to match your actual paint set"
                >
                  <Select
                    mode="multiple"
                    options={paintOptions[paintBrand] ?? []}
                    placeholder="Select colors"
                    showSearch
                    filterOption={filterSelectOptions}
                    allowClear
                  />
                </Form.Item>
              ))}
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  Save & Proceed
                </Button>
                <Button
                  icon={<ShareAltOutlined />}
                  title="Share this paint set"
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
        title="Share your paint set"
        open={isShareModalOpen}
        setOpen={setIsShareModalOpen}
        url={sharePaintSetUrl}
      />
    </>
  );
};
