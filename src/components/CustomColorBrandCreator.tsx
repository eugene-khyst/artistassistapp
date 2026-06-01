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

import {DeleteOutlined, DownOutlined, MinusOutlined, SaveOutlined} from '@ant-design/icons';
import {Trans, useLingui} from '@lingui/react/macro';
import {useQueryClient} from '@tanstack/react-query';
import type {FormInstance} from 'antd';
import {
  App,
  Button,
  Col,
  Divider,
  Dropdown,
  Flex,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Row,
  Slider,
  Space,
  Typography,
} from 'antd';
import type {AggregationColor} from 'antd/es/color-picker/color';
import type {SliderMarks} from 'antd/es/slider';
import {memo, useCallback, useEffect, useRef, useState} from 'react';

import {ColorPicker} from '@/components/color/ColorPicker';
import {ColorSquare} from '@/components/color/ColorSquare';
import {OpacitySelect} from '@/components/color/OpacitySelect';
import {ColorTypeSelect} from '@/components/color-set/ColorTypeSelect';
import {CustomColorBrandSelect} from '@/components/color-set/CustomColorBrandSelect';
import {FileSelect} from '@/components/file/FileSelect';
import {LoadingIndicator} from '@/components/loading/LoadingIndicator';
import {useCreateImageBitmap} from '@/hooks/useCreateImageBitmap';
import {useZoomableImageCanvas} from '@/hooks/useZoomableImageCanvas';
import type {PipettePointSetEvent} from '@/services/canvas/image/image-color-picker-canvas';
import {
  ColorPickerEventType,
  ImageColorPickerCanvas,
  MIN_COLOR_PICKER_DIAMETER,
} from '@/services/canvas/image/image-color-picker-canvas';
import {rgbToHex, WHITE_HEX} from '@/services/color/space/rgb';
import {
  type ColorDefinition,
  type CustomColorBrandDefinition,
  FileExtension,
} from '@/services/color/types';
import {useAppStore} from '@/stores/app-store';
import {removeRho} from '@/stores/custom-color-brand-slice';
import {noop} from '@/utils/function';

import styles from './CustomColorBrandCreator.module.css';

const FIELD = '${label}';

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

function applyColor(
  form: FormInstance<CustomColorBrandDefinition>,
  editFromIndex: number | null,
  setEditFromIndex: (value: number | null) => void,
  scrollToColor: (index: number) => void,
  hex: string
): void {
  const colors = form.getFieldValue('colors') as Partial<ColorDefinition>[];
  if (editFromIndex !== null && editFromIndex < colors.length) {
    const newColors = [...colors];
    newColors[editFromIndex] = {...newColors[editFromIndex], hex: hex.toUpperCase()};
    form.setFieldValue('colors', newColors);
    const nextIdx = editFromIndex + 1;
    const exitEditMode = nextIdx >= newColors.length;
    setEditFromIndex(exitEditMode ? null : nextIdx);
    scrollToColor(exitEditMode ? editFromIndex : nextIdx);
  } else {
    form.setFieldValue('colors', [
      ...colors,
      {
        id: colors.map(({id}) => id ?? 0).reduce((prev, curr) => Math.max(prev, curr), 0) + 1,
        hex: hex.toUpperCase(),
      },
    ]);
    scrollToColor(colors.length);
  }
  void form.validateFields(['colors']);
}

interface ColorDropdownProps {
  id?: string;
  value?: string;
  isEditTarget?: boolean;
  onEditFromHere?: () => void;
}

function ColorDropdown({id, value, isEditTarget, onEditFromHere}: Readonly<ColorDropdownProps>) {
  return (
    <Dropdown
      trigger={['click']}
      menu={{
        items: [
          {
            key: 'edit-from-here',
            label: <Trans>Edit from here on</Trans>,
            onClick: () => {
              onEditFromHere?.();
            },
          },
        ],
      }}
    >
      <Button
        id={id}
        icon={<DownOutlined />}
        iconPlacement="end"
        className={isEditTarget ? styles['editTarget'] : undefined}
      >
        <ColorSquare hex={value ?? WHITE_HEX} size="small" />
      </Button>
    </Dropdown>
  );
}

interface ColorListItemProps {
  name: number;
  isEditTarget: boolean;
  onSetEditFromIndex: (index: number | null) => void;
  onRemove: (index: number) => void;
}

const ColorListItem = memo(function ColorListItem({
  name,
  isEditTarget,
  onSetEditFromIndex,
  onRemove,
}: ColorListItemProps) {
  const {t} = useLingui();
  const status = isEditTarget ? 'warning' : undefined;

  return (
    <>
      <Flex gap="small">
        <Form.Item name={[name, 'hex']} rules={[{required: true, message: t`Required`}]}>
          <ColorDropdown
            isEditTarget={isEditTarget}
            onEditFromHere={() => {
              onSetEditFromIndex(name);
            }}
          />
        </Form.Item>
        <Form.Item name={[name, 'id']} rules={[{required: true, message: t`Required`}]}>
          <InputNumber placeholder="ID" status={status} className={styles['colorIdInput']} />
        </Form.Item>
        <Form.Item name={[name, 'name']} rules={[{required: true, message: t`Required`}]}>
          <Input placeholder={t`Name`} status={status} />
        </Form.Item>
        <Form.Item name={[name, 'opacity']}>
          <OpacitySelect popupMatchSelectWidth={false} status={status} />
        </Form.Item>
        <Button
          shape="circle"
          icon={<MinusOutlined />}
          onClick={() => {
            onRemove(name);
          }}
        />
      </Flex>
      {isEditTarget && (
        <Button
          type="primary"
          onClick={() => {
            onSetEditFromIndex(null);
          }}
          className="u-mb-lg"
        >
          <Trans>Finish editing</Trans>
        </Button>
      )}
    </>
  );
});

export function CustomColorBrandCreator() {
  const customColorBrands = useAppStore(state => state.customColorBrands);
  const latestCustomColorBrand = useAppStore(state => state.latestCustomColorBrand);
  const isCustomColorBrandsLoading = useAppStore(state => state.isCustomColorBrandsLoading);

  const loadCustomColorBrands = useAppStore(state => state.loadCustomColorBrands);
  const saveCustomColorBrand = useAppStore(state => state.saveCustomColorBrand);
  const loadCustomColorBrandFromJson = useAppStore(state => state.loadCustomColorBrandFromJson);
  const saveCustomColorBrandAsJson = useAppStore(state => state.saveCustomColorBrandAsJson);
  const deleteCustomColorBrand = useAppStore(state => state.deleteCustomColorBrand);

  const {message} = App.useApp();

  const {t} = useLingui();

  const queryClient = useQueryClient();

  const [form] = Form.useForm<CustomColorBrandDefinition>();

  const selectedCustomColorBrandId = Form.useWatch<number | undefined>('id', form);

  const [imageFile, setImageFile] = useState<File | null>();
  const [sampleDiameter, setSampleDiameter] = useState<number>(DEFAULT_SAMPLE_DIAMETER);
  const [currentColor, setCurrentColor] = useState<string>(WHITE_HEX);
  const [editFromIndex, setEditFromIndex] = useState<number | null>(null);

  const removeColorRef = useRef<(index: number) => void>(noop);

  const scrollToColor = useCallback(
    (index: number) => {
      requestAnimationFrame(() => {
        form.scrollToField(['colors', index, 'hex'], {behavior: 'smooth', block: 'nearest'});
      });
    },
    [form]
  );

  const imageColorPickerCanvasSupplier = useCallback(
    (canvas: HTMLCanvasElement): ImageColorPickerCanvas => {
      const colorPickerCanvas = new ImageColorPickerCanvas(canvas);
      colorPickerCanvas.setPipetteDiameter(DEFAULT_SAMPLE_DIAMETER);
      return colorPickerCanvas;
    },
    []
  );

  const {imageBitmap, isLoading: isImageLoading} = useCreateImageBitmap(imageFile);

  const {ref: canvasRef, zoomableImageCanvas: colorPickerCanvas} =
    useZoomableImageCanvas<ImageColorPickerCanvas>(imageColorPickerCanvasSupplier, imageBitmap);

  useEffect(() => {
    if (!colorPickerCanvas) {
      return;
    }
    const listener = ({rgb}: PipettePointSetEvent) => {
      const hex = rgbToHex(...rgb);
      setCurrentColor(hex);
      applyColor(form, editFromIndex, setEditFromIndex, scrollToColor, hex);
    };
    colorPickerCanvas.events.subscribe(ColorPickerEventType.PipettePointSet, listener);
    return () => {
      colorPickerCanvas.events.unsubscribe(ColorPickerEventType.PipettePointSet, listener);
    };
  }, [form, colorPickerCanvas, editFromIndex, scrollToColor]);

  useEffect(() => {
    void loadCustomColorBrands();
  }, [loadCustomColorBrands]);

  useEffect(() => {
    if (latestCustomColorBrand) {
      form.resetFields();
      form.setFieldsValue(removeRho(latestCustomColorBrand));
    }
  }, [latestCustomColorBrand, form]);

  const isLoading: boolean = isImageLoading || isCustomColorBrandsLoading;

  const invalidateQueries = () => {
    ['brands', 'colors', 'standardColorSets'].forEach(
      key => void queryClient.invalidateQueries({queryKey: [key]})
    );
  };

  const handleImageFileChange = ([file]: File[]) => {
    setImageFile(file ?? null);
  };

  const handleJsonFileChange = async ([file]: File[]) => {
    if (!file) {
      return;
    }
    const brand: CustomColorBrandDefinition | undefined = await loadCustomColorBrandFromJson(file);
    if (brand) {
      invalidateQueries();
      form.resetFields();
      form.setFieldsValue(removeRho(brand));
      setEditFromIndex(null);
    }
  };

  const handleSampleDiameterChange = (pipetDiameter: number) => {
    colorPickerCanvas?.setPipetteDiameter(pipetDiameter);
    setSampleDiameter(pipetDiameter);
  };

  const handleCurrentColorChange = (hex: string) => {
    colorPickerCanvas?.setPipettePoint(null);
    setCurrentColor(hex);
    applyColor(form, editFromIndex, setEditFromIndex, scrollToColor, hex);
  };

  const handleFormValuesChange = (changedValues: Partial<CustomColorBrandDefinition>) => {
    if (changedValues.id !== undefined) {
      form.resetFields();
      setEditFromIndex(null);
      if (changedValues.id > 0) {
        const brand: CustomColorBrandDefinition | undefined = customColorBrands.find(
          ({id}: CustomColorBrandDefinition) => id === changedValues.id
        );
        if (brand) {
          form.setFieldsValue(removeRho(brand));
        }
      }
    }
  };

  const handleCreateNewClick = () => {
    form.resetFields();
  };

  const handleSubmit = async (brand: CustomColorBrandDefinition) => {
    brand = await saveCustomColorBrand(brand);
    saveCustomColorBrandAsJson(brand);
    invalidateQueries();
    form.setFieldsValue(brand);
  };

  const handleSubmitFailed = () => {
    void message.error(t`Fill in the required fields`);
  };

  const handleDeleteButtonClick = async () => {
    const id = form.getFieldValue('id') as number | undefined;
    if (id) {
      await deleteCustomColorBrand(id);
      invalidateQueries();
      form.resetFields();
      setEditFromIndex(null);
    }
  };

  const handleRemoveColor = useCallback((index: number) => {
    removeColorRef.current(index);
    setEditFromIndex(null);
  }, []);

  return (
    <LoadingIndicator loading={isLoading}>
      <Row>
        <Col xs={24} sm={12} lg={8}>
          <canvas ref={canvasRef} className={styles['previewCanvas']} />
        </Col>
        <Col xs={24} sm={12} lg={16} className={styles['sidePanel']}>
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
            <Row gutter={[32, 32]} className={styles['formGrid']}>
              <Col xs={24} lg={12}>
                <Space orientation="vertical" className={styles['controlStack']}>
                  <Typography.Text strong>
                    <Trans>Select an image that contains a color chart</Trans>
                  </Typography.Text>

                  <Space>
                    <FileSelect onChange={handleImageFileChange}>
                      <Trans>Select image</Trans>
                    </FileSelect>
                    <FileSelect
                      type="default"
                      accept={{'application/json': [FileExtension.CustomColorBrand, '.json']}}
                      onChange={(files: File[]) => void handleJsonFileChange(files)}
                    >
                      <Trans>Load color brand file</Trans>
                    </FileSelect>
                  </Space>

                  <Form.Item
                    label={t`Diameter`}
                    tooltip={t`The diameter of the circular area around the cursor, used to calculate the average color of the pixels within the area.`}
                    className="u-mb-0"
                  >
                    <Slider
                      value={sampleDiameter}
                      onChange={handleSampleDiameterChange}
                      min={MIN_COLOR_PICKER_DIAMETER}
                      max={MAX_SAMPLE_DIAMETER}
                      marks={SAMPLE_DIAMETER_SLIDER_MARKS}
                    />
                  </Form.Item>

                  <Form.Item label={t`Color`} className="u-mb-0">
                    <ColorPicker
                      value={currentColor}
                      onChangeComplete={(color: AggregationColor) => {
                        handleCurrentColorChange(color.toHexString());
                      }}
                      showText
                      disabledAlpha
                    />
                  </Form.Item>

                  <Divider className="u-divider-compact" />

                  <Form.Item
                    name="id"
                    label={t`Color brand`}
                    rules={[{required: true, message: t`${FIELD} is required`}]}
                  >
                    <CustomColorBrandSelect
                      customColorBrands={customColorBrands}
                      onCreateNewClick={handleCreateNewClick}
                    />
                  </Form.Item>

                  <Form.Item
                    name="type"
                    label={t`Art medium`}
                    rules={[{required: true, message: t`${FIELD} is required`}]}
                  >
                    <ColorTypeSelect />
                  </Form.Item>

                  <Form.Item
                    name="name"
                    label={t`Name`}
                    rules={[{required: true, message: t`${FIELD} is required`}]}
                  >
                    <Input placeholder={t`Name a brand`} />
                  </Form.Item>

                  <Space wrap>
                    <Button icon={<SaveOutlined />} type="primary" htmlType="submit">
                      <Trans>Save</Trans>
                    </Button>

                    {!!selectedCustomColorBrandId && (
                      <Popconfirm
                        title={t`Delete the custom brand`}
                        description={t`Are you sure you want to delete this custom brand?`}
                        onConfirm={() => {
                          void handleDeleteButtonClick();
                        }}
                        okText={t`Yes`}
                        cancelText={t`No`}
                      >
                        <Button
                          icon={<DeleteOutlined />}
                          title={t`Delete the custom brand`}
                          onClick={e => {
                            e.stopPropagation();
                          }}
                        >
                          <Trans>Delete</Trans>
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
                          return Promise.reject(new Error(t`At least one color is required`));
                        }
                      },
                    },
                  ]}
                >
                  {(fields, {remove}, {errors}) => {
                    // Assigned during render because `remove` is only available in this render prop,
                    // but consumed in `handleRemoveColor` (a stable useCallback for memo).
                    // Safe: the ref is only read in click handlers, which fire after commit.
                    removeColorRef.current = remove;
                    return (
                      <>
                        {fields.map(field => (
                          <ColorListItem
                            key={field.key}
                            name={field.name}
                            isEditTarget={field.name === editFromIndex}
                            onSetEditFromIndex={setEditFromIndex}
                            onRemove={handleRemoveColor}
                          />
                        ))}
                        {errors.length > 0 && (
                          <Form.Item>
                            <Form.ErrorList errors={errors} />
                          </Form.Item>
                        )}
                      </>
                    );
                  }}
                </Form.List>
              </Col>
            </Row>
          </Form>
        </Col>
      </Row>
    </LoadingIndicator>
  );
}
