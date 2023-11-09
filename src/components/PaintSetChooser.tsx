/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {ShareAltOutlined} from '@ant-design/icons';
import {
  App,
  Button,
  Cascader,
  CheckboxOptionType,
  Form,
  Radio,
  Select,
  SelectProps,
  Space,
  Spin,
  Typography,
} from 'antd';
import {DefaultOptionType as SelectOptionType} from 'antd/es/select';
import {Dispatch, ReactElement, SetStateAction, useEffect, useState} from 'react';
import {usePaints, useStoreBoughtPaintSets} from '../hooks/';
import {
  PAINT_BRANDS,
  PAINT_BRAND_LABELS,
  PAINT_TYPE_LABELS,
  Paint,
  PaintBrand,
  PaintSet,
  PaintSetDefinition,
  PaintType,
  StoreBoughtPaintSet,
  paintSetFromUrl,
  paintSetToUrl,
  toPaintSet,
} from '../services/color';
import {getLastPaintSet, getPaintSetByType, savePaintSet} from '../services/db';
import {SharePaintSetModal} from './SharePaintSetModal';
import {ColorSquare} from './color/ColorSquare';
import {CascaderOption, TabKey} from './types';

const PAINT_TYPE_OPTIONS: CheckboxOptionType[] = Object.entries(PAINT_TYPE_LABELS).map(
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
    [...paints.entries()].map(([brand, paints]: [PaintBrand, Map<number, Paint>]) => [
      brand,
      [...paints.values()].map(({id, name, rgb}: Paint) => {
        const label: string = id < 1000 ? `${String(id).padStart(3, '0')} ${name}` : name;
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
    ])
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

function getSharedPaintSet(): PaintSetDefinition | undefined {
  const paintSet: PaintSetDefinition | undefined = paintSetFromUrl(window.location.toString());
  if (paintSet) {
    history.pushState({}, '', '/');
  }
  return paintSet;
}

const sharedPaintSet: PaintSetDefinition | undefined = getSharedPaintSet();

type Props = {
  setPaintSet: Dispatch<SetStateAction<PaintSet | undefined>>;
  setActiveTabKey: Dispatch<SetStateAction<TabKey>>;
  blob?: Blob;
};

export const PaintSetChooser: React.FC<Props> = ({setPaintSet, setActiveTabKey, blob}: Props) => {
  const {message} = App.useApp();
  const [form] = Form.useForm<PaintSetDefinition>();
  const paintType = Form.useWatch<PaintType | undefined>('type', form);
  const paintBrands = Form.useWatch<PaintBrand[] | undefined>('brands', form);

  const [url, setUrl] = useState<string>();
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      if (sharedPaintSet) {
        form.setFieldsValue(sharedPaintSet);
      } else {
        const lastPaintSet: PaintSetDefinition | undefined = await getLastPaintSet();
        if (lastPaintSet) {
          form.setFieldsValue(lastPaintSet);
        }
      }
    })();
  }, [form]);

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
    const colors: Partial<Record<PaintBrand, number[]>> = values.colors
      ? Object.fromEntries(Object.keys(values.colors).map((brand: string) => [brand, []]))
      : {};
    if (changedValues.type) {
      form.setFieldsValue({
        brands: [],
        storeBoughtPaintSet: undefined,
        colors,
      });
      const valuesFromDb: PaintSetDefinition | undefined = await getPaintSetByType(
        changedValues.type
      );
      if (valuesFromDb) {
        form.setFieldsValue(valuesFromDb);
      }
    }
    if (changedValues.brands) {
      form.setFieldsValue({
        storeBoughtPaintSet: undefined,
        colors,
      });
    }
    if (changedValues.storeBoughtPaintSet) {
      if (changedValues.storeBoughtPaintSet[0] && storeBoughtPaintSets.size) {
        const [brand, storeBoughtPaintSetName] = changedValues.storeBoughtPaintSet;
        colors[brand] = storeBoughtPaintSets.get(brand)?.get(storeBoughtPaintSetName)?.colors;
      }
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
    setActiveTabKey(!blob ? TabKey.Photo : TabKey.Colors);
  };

  const handleSubmitFailed = () => {
    message.error('Form validation error');
  };

  const showShareModal = () => {
    setUrl(paintSetToUrl(form.getFieldsValue()));
    setIsShareModalOpen(true);
  };

  return (
    <>
      <div style={{padding: '0 16px'}}>
        <Typography.Title level={3} style={{marginTop: '0.5em'}}>
          Select paints
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
              label="Paint type"
              rules={[{required: true, message: '${label} is required'}]}
            >
              <Radio.Group options={PAINT_TYPE_OPTIONS} optionType="button" buttonStyle="solid" />
            </Form.Item>
            {!!paintType && (
              <Form.Item
                name="brands"
                label="Paint brands"
                rules={[{required: true, message: '${label} are required'}]}
                dependencies={['paintType']}
              >
                <Select
                  mode="multiple"
                  options={paintBrandOptions}
                  placeholder="Select paint brands"
                  showSearch
                  filterOption={filterSelectOptions}
                  allowClear
                />
              </Form.Item>
            )}
            {!!paintBrands?.length && (
              <Form.Item
                name="storeBoughtPaintSet"
                label="Paint set"
                rules={[{required: true, message: '${label} is required'}]}
                dependencies={['paintType', 'paintBrands']}
                tooltip="Do you have a store-bought or custom paint set?"
              >
                <Cascader
                  options={storeBoughtPaintSetOptions}
                  placeholder="Select paint set"
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
                  rules={[{required: true, message: '${label} are required'}]}
                  dependencies={['paintType', 'paintBrands', 'storeBoughtPaintSet']}
                  tooltip="Add or remove colors to match your actual paint set"
                >
                  <Select
                    mode="multiple"
                    options={paintOptions[paintBrand] ?? []}
                    placeholder="Select colors"
                    maxTagCount={36}
                    showSearch
                    filterOption={filterSelectOptions}
                    allowClear
                  />
                </Form.Item>
              ))}
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  Proceed
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
      <SharePaintSetModal open={isShareModalOpen} setOpen={setIsShareModalOpen} url={url} />
    </>
  );
};
