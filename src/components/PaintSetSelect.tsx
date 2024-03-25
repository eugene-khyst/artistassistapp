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
import {App, Button, Col, ConfigProvider, Form, Row, Space, Spin, Typography} from 'antd';
import {Dispatch, SetStateAction, useContext, useEffect, useState} from 'react';
import {AppConfig, AppConfigContext} from '../context/AppConfigContext';
import {usePaints, useStoreBoughtPaintSets} from '../hooks';
import {AdsDefinition} from '../services/ads';
import {
  PAINT_BRANDS,
  PAINT_MIXING,
  PAINT_TYPES,
  PaintBrand,
  PaintSet,
  PaintSetDefinition,
  PaintType,
  paintSetToUrl,
  toPaintSet,
} from '../services/color';
import {getLastPaintSet, getPaintSetByType, savePaintSet} from '../services/db';
import {Ad} from './ad/Ad';
import {PaintBrandSelect} from './color/PaintBrandSelect';
import {PaintSelect} from './color/PaintSelect';
import {PaintTypeSelect} from './color/PaintTypeSelect';
import {StoreBoughtPaintSetCascader} from './color/StoreBoughtPaintSetCascader';
import {ShareModal} from './modal/ShareModal';
import {TabKey} from './types';

const MAX_COLORS = 36;
const CUSTOM_PAINT_SET = [0];

const formInitialValues: PaintSetDefinition = {
  brands: [],
  colors: {},
};

type Props = {
  setPaintSet: Dispatch<SetStateAction<PaintSet | undefined>>;
  importedPaintSet?: PaintSetDefinition;
  setActiveTabKey: Dispatch<SetStateAction<TabKey>>;
  ads?: AdsDefinition;
};

export const PaintSetSelect: React.FC<Props> = ({
  setPaintSet,
  importedPaintSet,
  setActiveTabKey,
  ads,
}: Props) => {
  const {quickStartUrl} = useContext<AppConfig>(AppConfigContext);

  const {message} = App.useApp();

  const [form] = Form.useForm<PaintSetDefinition>();
  const paintType = Form.useWatch<PaintType | undefined>('type', form);
  const paintBrands = Form.useWatch<PaintBrand[] | undefined>('brands', form);

  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [sharePaintSetUrl, setSharePaintSetUrl] = useState<string>();

  useEffect(() => {
    (async () => {
      if (importedPaintSet) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('Importing paint set', importedPaintSet);
        }
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

  const handleHelpButtonClick = () => {
    setActiveTabKey(TabKey.Help);
  };

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
      form.setFieldsValue({storeBoughtPaintSet: CUSTOM_PAINT_SET});
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
        <Row gutter={[16, 16]} style={{marginBottom: 16}}>
          <Col xs={24} md={12} lg={14}>
            <Space direction="vertical" size="small">
              <Typography.Text>
                <strong>ArtistAssistApp</strong> is a painting assistant tool that allows you to see
                the reference more clearly and mix colors more accurately.
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
          Select your medium, color brands and up to {MAX_COLORS} colors you will paint with and
          press the <Typography.Text code>Save & proceed</Typography.Text> button.
        </Typography.Text>
        <Spin spinning={isLoading} tip="Loading" size="large" delay={300}>
          <Form
            name="paintSet"
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
              <PaintTypeSelect />
            </Form.Item>
            {!!paintType && (
              <Form.Item
                name="brands"
                label="Brands"
                tooltip={`Select ${PAINT_TYPES.get(paintType)?.name.toLowerCase()} brands that you use.`}
                rules={[{required: true, message: '${label} are required'}]}
                dependencies={['paintType']}
              >
                <PaintBrandSelect mode="multiple" type={paintType} />
              </Form.Item>
            )}
            {!!paintBrands?.length && (
              <Form.Item
                name="storeBoughtPaintSet"
                label="Set"
                rules={[{required: true, message: '${label} is required'}]}
                dependencies={['paintType', 'paintBrands']}
                tooltip="Do you have a store-bought or custom color set?"
              >
                <StoreBoughtPaintSetCascader
                  type={paintType}
                  storeBoughtPaintSets={storeBoughtPaintSets}
                />
              </Form.Item>
            )}
            {!!paintType &&
              paintBrands?.map((paintBrand: PaintBrand) => (
                <Form.Item
                  key={paintBrand}
                  name={['colors', paintBrand.toString()]}
                  label={`${PAINT_BRANDS.get(paintType)?.get(paintBrand)?.fullName} colors`}
                  rules={[
                    {required: true, message: '${label} are required'},
                    ({getFieldValue}) => ({
                      validator() {
                        const paintType = getFieldValue('type') as PaintType;
                        if (PAINT_MIXING[paintType].maxPaintsCount === 1) {
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
                  tooltip="Add or remove colors to match your actual color set."
                >
                  <PaintSelect mode="multiple" paints={paints.get(paintBrand)} />
                </Form.Item>
              ))}
            <Form.Item>
              <Space>
                <Button icon={<SaveOutlined />} type="primary" htmlType="submit">
                  Save & Proceed
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
        url={sharePaintSetUrl}
      />
    </>
  );
};
