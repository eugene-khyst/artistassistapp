/**
 * ArtistAssistApp
 * Copyright (C) 2023-2025  Eugene Khyst
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

import {DeleteOutlined, LoadingOutlined, MinusOutlined, SaveOutlined} from '@ant-design/icons';
import {useQueryClient} from '@tanstack/react-query';
import {
  App,
  Button,
  Col,
  ColorPicker,
  Divider,
  Flex,
  Form,
  Grid,
  Input,
  InputNumber,
  Popconfirm,
  Row,
  Slider,
  Space,
  Spin,
  Typography,
} from 'antd';
import type {Color} from 'antd/es/color-picker';
import type {SliderMarks} from 'antd/es/slider';
import {saveAs} from 'file-saver';
import type {ChangeEvent} from 'react';
import {useCallback, useEffect, useState} from 'react';

import {ColorTypeSelect} from '~/src/components/color-set/ColorTypeSelect';
import {CustomColorBrandSelect} from '~/src/components/color-set/CustomColorBrandSelect';
import {FileSelect} from '~/src/components/image/FileSelect';
import {useCreateImageBitmap} from '~/src/hooks/useCreateImageBitmap';
import {useZoomableImageCanvas} from '~/src/hooks/useZoomableImageCanvas';
import type {PipetPointSetEvent} from '~/src/services/canvas/image/image-color-picker-canvas';
import {
  ColorPickerEventType,
  ImageColorPickerCanvas,
  MIN_COLOR_PICKER_DIAMETER,
} from '~/src/services/canvas/image/image-color-picker-canvas';
import {Rgb} from '~/src/services/color/space/rgb';
import type {ColorDefinition, CustomColorBrandDefinition} from '~/src/services/color/types';
import {getLastCustomColorBrand} from '~/src/services/db/custom-brand-db';
import {useAppStore} from '~/src/stores/app-store';

const DEFAULT_SAMPLE_DIAMETER = 10;
const MAX_SAMPLE_DIAMETER = 50;
const SAMPLE_DIAMETER_SLIDER_MARKS: SliderMarks = Object.fromEntries(
  [1, 10, 20, 30, 40, 50].map((i: number) => [i, i])
);

const NEW_CUSTOM_COLOR_BRAND = 0;

const formInitialValues: CustomColorBrandDefinition = {
  id: NEW_CUSTOM_COLOR_BRAND,
  type: undefined,
  name: undefined,
  colors: [],
};

function calculateRho(brand: CustomColorBrandDefinition): CustomColorBrandDefinition {
  const {colors} = brand;
  return {
    ...brand,
    colors: colors?.map((color: Partial<ColorDefinition>): Partial<ColorDefinition> => {
      const {hex} = color;
      return {
        ...color,
        rho: [...Rgb.fromHex(hex!).toReflectance().toArray()],
      };
    }),
  };
}

export const CustomColorBrandCreator: React.FC = () => {
  const customColorBrands = useAppStore(state => state.customColorBrands);
  const loadCustomColorBrands = useAppStore(state => state.loadCustomColorBrands);
  const saveCustomColorBrand = useAppStore(state => state.saveCustomColorBrand);
  const deleteCustomColorBrand = useAppStore(state => state.deleteCustomColorBrand);

  const queryClient = useQueryClient();

  const screens = Grid.useBreakpoint();
  const {message} = App.useApp();

  const [form] = Form.useForm<CustomColorBrandDefinition>();

  const selectedCustomColorBrandId = Form.useWatch<number | undefined>('id', form);

  const [imageFile, setImageFile] = useState<File | null>();
  const [sampleDiameter, setSampleDiameter] = useState<number>(DEFAULT_SAMPLE_DIAMETER);
  const [currentColor, setCurrentColor] = useState<string>('FFFFFF');

  const imageColorPickerCanvasSupplier = useCallback(
    (canvas: HTMLCanvasElement): ImageColorPickerCanvas => {
      const colorPickerCanvas = new ImageColorPickerCanvas(canvas);
      colorPickerCanvas.setPipetDiameter(DEFAULT_SAMPLE_DIAMETER);
      const listener = ({rgb}: PipetPointSetEvent) => {
        const hex = rgb.toHex();
        console.log(hex.toUpperCase());
        setCurrentColor(hex);
        const colors = form.getFieldValue('colors') as Partial<ColorDefinition>[];
        form.setFieldValue('colors', [
          ...colors,
          {
            id: colors.map(({id}) => id ?? 0).reduce((prev, curr) => Math.max(prev, curr), 0) + 1,
            hex,
          },
        ]);
        void form.validateFields(['colors']);
      };
      colorPickerCanvas.events.subscribe(ColorPickerEventType.PipetPointSet, listener);
      return colorPickerCanvas;
    },
    [form]
  );

  const {imageBitmap, isLoading} = useCreateImageBitmap(imageFile);

  const {ref: canvasRef, zoomableImageCanvas: colorPickerCanvas} =
    useZoomableImageCanvas<ImageColorPickerCanvas>(imageColorPickerCanvasSupplier, imageBitmap);

  useEffect(() => {
    void loadCustomColorBrands();
  }, [loadCustomColorBrands]);

  useEffect(() => {
    void (async () => {
      const latestCustomColorBrand: CustomColorBrandDefinition | undefined =
        await getLastCustomColorBrand();
      if (latestCustomColorBrand) {
        form.setFieldsValue(latestCustomColorBrand);
      }
    })();
  }, [form]);

  const handleImageFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file: File | null = e.target.files?.[0] ?? null;
    setImageFile(file);
  };

  const handleJsonFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file: File | null = e.target.files?.[0] ?? null;
    if (file) {
      form.resetFields();
      form.setFieldsValue(JSON.parse(await file.text()) as CustomColorBrandDefinition);
    }
  };

  const handleSampleDiameterChange = (pipetDiameter: number) => {
    colorPickerCanvas?.setPipetDiameter(pipetDiameter);
    setSampleDiameter(pipetDiameter);
  };

  const handleCurrentColorChange = (hex: string) => {
    colorPickerCanvas?.setPipetPoint(null);
    setCurrentColor(hex);
    const colors = form.getFieldValue('colors') as Partial<ColorDefinition>[];
    form.setFieldValue('colors', [
      ...colors,
      {
        id: colors.map(({id}) => id ?? 0).reduce((prev, curr) => Math.max(prev, curr), 0) + 1,
        hex,
      },
    ]);
    void form.validateFields(['colors']);
  };

  const handleFormValuesChange = (changedValues: Partial<CustomColorBrandDefinition>) => {
    if ((changedValues.id ?? -1) >= 0) {
      form.resetFields();
      if (changedValues.id! > 0) {
        const brand: CustomColorBrandDefinition | undefined = customColorBrands.find(
          ({id}: CustomColorBrandDefinition) => id === changedValues.id
        );
        if (brand) {
          form.setFieldsValue(brand);
        }
      }
    }
  };

  const handleCreateNewClick = () => {
    form.resetFields();
  };

  const invalidateQueries = () => {
    ['brands', 'colors', 'standardColorSets'].forEach(
      key => void queryClient.invalidateQueries({queryKey: [key]})
    );
  };

  const handleSubmit = async (values: CustomColorBrandDefinition) => {
    const {id, ...brand} = values;
    form.setFieldsValue(
      await saveCustomColorBrand({
        ...calculateRho(brand),
        ...(id ? {id} : {}),
      })
    );
    saveAs(new Blob([JSON.stringify(brand)], {type: 'application/json'}), `${brand.name}.json`);
    invalidateQueries();
  };

  const handleSubmitFailed = () => {
    void message.error('Fill in the required fields');
  };

  const handleDeleteButtonClick = async () => {
    const id = form.getFieldValue('id') as number | undefined;
    if (id) {
      await deleteCustomColorBrand(id);
      form.resetFields();
      invalidateQueries();
    }
  };

  const height = `calc((100dvh - 75px) / ${screens.sm ? '1' : '2 - 8px'})`;
  const margin = screens.sm ? 0 : 8;

  return (
    <Spin spinning={isLoading} tip="Loading" indicator={<LoadingOutlined spin />} size="large">
      <Row>
        <Col xs={24} sm={12} lg={8}>
          <canvas
            ref={canvasRef}
            style={{
              width: '100%',
              height,
              marginBottom: margin,
            }}
          />
        </Col>
        <Col
          xs={24}
          sm={12}
          lg={16}
          style={{
            maxHeight: height,
            marginTop: margin,
            overflowY: 'auto',
          }}
        >
          <Form
            name="customColorBrand"
            form={form}
            initialValues={formInitialValues}
            onValuesChange={handleFormValuesChange}
            onFinish={values => void handleSubmit(values)}
            onFinishFailed={handleSubmitFailed}
            layout="vertical"
            requiredMark="optional"
            autoComplete="off"
          >
            <Row gutter={[32, 32]} style={{width: '100%', padding: '0 16px 16px'}}>
              <Col xs={24} lg={12}>
                <Space direction="vertical" style={{display: 'flex'}}>
                  <Typography.Text strong>
                    Select an image that contains a color chart
                  </Typography.Text>

                  <Space>
                    <FileSelect onChange={handleImageFileChange}>Select image</FileSelect>
                    <FileSelect
                      type="default"
                      accept="application/json"
                      onChange={e => void handleJsonFileChange(e)}
                    >
                      Import JSON
                    </FileSelect>
                  </Space>

                  <Form.Item
                    label="Diameter"
                    tooltip="The diameter of the circular area around the cursor, used to calculate the average color of the pixels within the area."
                    style={{marginBottom: 0}}
                  >
                    <Slider
                      value={sampleDiameter}
                      onChange={handleSampleDiameterChange}
                      min={MIN_COLOR_PICKER_DIAMETER}
                      max={MAX_SAMPLE_DIAMETER}
                      marks={SAMPLE_DIAMETER_SLIDER_MARKS}
                    />
                  </Form.Item>

                  <Form.Item label="Color" style={{marginBottom: 0}}>
                    <ColorPicker
                      value={currentColor}
                      onChangeComplete={(color: Color) => {
                        handleCurrentColorChange(color.toHexString());
                      }}
                      showText
                      disabledAlpha
                    />
                  </Form.Item>

                  <Divider style={{margin: '8px 0'}} />

                  <Form.Item
                    name="id"
                    label="Brand"
                    rules={[{required: true, message: '${label} is required'}]}
                  >
                    <CustomColorBrandSelect
                      customColorBrands={customColorBrands}
                      onCreateNewClick={handleCreateNewClick}
                    />
                  </Form.Item>

                  <Form.Item
                    name="type"
                    label="Medium"
                    rules={[{required: true, message: '${label} is required'}]}
                  >
                    <ColorTypeSelect />
                  </Form.Item>

                  <Form.Item
                    name="name"
                    label="Name"
                    rules={[{required: true, message: '${label} is required'}]}
                  >
                    <Input placeholder="Name a brand" />
                  </Form.Item>

                  <Space wrap>
                    <Button icon={<SaveOutlined />} type="primary" htmlType="submit">
                      Save
                    </Button>

                    {!!selectedCustomColorBrandId && (
                      <Popconfirm
                        title="Delete the custom brand"
                        description="Are you sure you want to delete this custom brand?"
                        onConfirm={() => {
                          void handleDeleteButtonClick();
                        }}
                        okText="Yes"
                        cancelText="No"
                      >
                        <Button
                          icon={<DeleteOutlined />}
                          title="Delete the custom brand"
                          onClick={e => {
                            e.stopPropagation();
                          }}
                        >
                          Delete
                        </Button>
                      </Popconfirm>
                    )}
                  </Space>
                </Space>
              </Col>
              <Col xs={24} lg={12}>
                <Form.List
                  name="colors"
                  rules={[
                    {
                      validator: async (_, colors?: ColorDefinition[]) => {
                        if (!colors || colors.length < 1) {
                          return Promise.reject(new Error('At least one color is required'));
                        }
                      },
                    },
                  ]}
                >
                  {(fields, {remove}, {errors}) => (
                    <>
                      {fields
                        .slice()
                        .reverse()
                        .map(({key, name, ...restField}) => (
                          <Flex key={key} gap="small">
                            <Form.Item
                              {...restField}
                              name={[name, 'hex']}
                              rules={[{required: true, message: 'Color is required'}]}
                            >
                              <ColorPicker disabled />
                            </Form.Item>
                            <Form.Item
                              {...restField}
                              name={[name, 'id']}
                              rules={[{required: true, message: 'ID is required'}]}
                            >
                              <InputNumber placeholder="ID" style={{width: 70}} />
                            </Form.Item>
                            <Form.Item
                              {...restField}
                              name={[name, 'name']}
                              rules={[{required: true, message: 'Name is required'}]}
                            >
                              <Input placeholder="Name" />
                            </Form.Item>
                            <Button
                              shape="circle"
                              icon={<MinusOutlined />}
                              onClick={() => {
                                remove(name);
                              }}
                            />
                          </Flex>
                        ))}
                      {errors.length > 0 && (
                        <Form.Item>
                          <Form.ErrorList errors={errors} />
                        </Form.Item>
                      )}
                    </>
                  )}
                </Form.List>
              </Col>
            </Row>
          </Form>
        </Col>
      </Row>
    </Spin>
  );
};
