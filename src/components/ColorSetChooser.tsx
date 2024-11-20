/**
 * ArtistAssistApp
 * Copyright (C) 2023-2024  Eugene Khyst
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
  AppstoreAddOutlined,
  DeleteOutlined,
  LoadingOutlined,
  QuestionCircleOutlined,
  SaveOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import {
  App,
  Button,
  Col,
  Divider,
  Flex,
  Form,
  Input,
  Popconfirm,
  Row,
  Space,
  Spin,
  Tooltip,
  Typography,
} from 'antd';
import type {ForwardedRef} from 'react';
import {forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState} from 'react';

import {AdCard} from '~/src/components/ad/AdCard';
import {JoinButton} from '~/src/components/auth/JoinButton';
import {LoginButton} from '~/src/components/auth/LoginButton';
import {LogoutButton} from '~/src/components/auth/LogoutButton';
import {ColorSetSelect} from '~/src/components/color-set/ColorSetSelect';
import type {ChangableComponent} from '~/src/components/types';
import {useColorBrands, useColors, useStandardColorSets} from '~/src/hooks';
import {useAuth} from '~/src/hooks/useAuth';
import type {ColorBrandDefinition, ColorSetDefinition, ColorType} from '~/src/services/color';
import {
  COLOR_MIXING,
  COLOR_TYPES,
  hasAccessToBrand,
  hasAccessToBrands,
  THREE_COLORS_MIXTURES_LIMIT,
} from '~/src/services/color';
import {colorSetToUrl} from '~/src/services/url';
import {useAppStore} from '~/src/stores/app-store';
import {TabKey} from '~/src/tabs';

import {ColorBrandSelect} from './color-set/ColorBrandSelect';
import {ColorSelect} from './color-set/ColorSelect';
import {ColorTypeSelect} from './color-set/ColorTypeSelect';
import {StandardColorSetCascader} from './color-set/StandardColorSetCascader';
import {ShareModal} from './share/ShareModal';

const NEW_COLOR_SET = 0;
const CUSTOM_COLOR_SET = [0];

const formInitialValues: ColorSetDefinition = {
  id: 0,
  brands: [],
  colors: {},
};

function getEmptyColors(values: ColorSetDefinition): Partial<Record<number, number[]>> {
  return values.colors
    ? Object.fromEntries(Object.keys(values.colors).map((brand: string) => [brand, []]))
    : {};
}

interface Props {
  showInstallPromotion: boolean;
}

export const ColorSetChooser = forwardRef<ChangableComponent, Props>(function ColorSetChooser(
  {showInstallPromotion}: Props,
  ref: ForwardedRef<ChangableComponent>
) {
  const importedColorSet = useAppStore(state => state.importedColorSet);
  const latestColorSet = useAppStore(state => state.latestColorSet);
  const isInitialStateLoading = useAppStore(state => state.isInitialStateLoading);
  const colorSetsByType = useAppStore(state => state.colorSetsByType);

  const setActiveTabKey = useAppStore(state => state.setActiveTabKey);
  const loadColorSetsByType = useAppStore(state => state.loadColorSetsByType);
  const saveColorSet = useAppStore(state => state.saveColorSet);
  const deleteColorSet = useAppStore(state => state.deleteColorSet);

  const {message, notification, modal} = App.useApp();

  const {user, isLoading: isAuthLoading} = useAuth();

  const [form] = Form.useForm<ColorSetDefinition>();
  const selectedType = Form.useWatch<ColorType | undefined>('type', form);
  const selectedColorSetId = Form.useWatch<number | undefined>('id', form);
  const selectedBrandIds = Form.useWatch<number[] | undefined>('brands', form);
  const selectedColors = Form.useWatch<Record<number, number[] | undefined> | undefined>(
    'colors',
    form
  );

  const saveButtonRef = useRef<HTMLButtonElement>(null);

  const selectedColorsCount: number = Object.values(selectedColors ?? {})
    .map((ids: number[] | undefined) => ids?.length ?? 0)
    .reduce((a: number, b: number) => a + b, 0);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [shareColorSetUrl, setShareColorSetUrl] = useState<string>();

  useEffect(() => {
    const colorSet: ColorSetDefinition | null = importedColorSet ?? latestColorSet;
    if (colorSet) {
      form.setFieldsValue(colorSet);
    }
  }, [form, importedColorSet, latestColorSet]);

  const {brands, isLoading: isBrandsLoading, isError: isBrandsError} = useColorBrands(selectedType);

  const selectedBrands: ColorBrandDefinition[] | undefined = selectedBrandIds
    ?.map((id: number) => brands?.get(id))
    .filter((brand): brand is ColorBrandDefinition => !!brand);

  const isAccessAllowed: boolean =
    !selectedBrands || (!isAuthLoading && hasAccessToBrands(user, selectedBrands));

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
    isInitialStateLoading ||
    isBrandsLoading ||
    isStandardColorSetsLoading ||
    isColorsLoading ||
    isAuthLoading;

  useEffect(() => {
    if (isBrandsError) {
      notification.error({
        message: 'Error while fetching color brand data',
        placement: 'top',
        duration: 0,
      });
    }
  }, [isBrandsError, notification]);

  useEffect(() => {
    if (isStandardColorSetsError) {
      notification.error({
        message: 'Error while fetching standard color set data',
        placement: 'top',
        duration: 0,
      });
    }
  }, [isStandardColorSetsError, notification]);

  useEffect(() => {
    if (isColorsError) {
      notification.error({
        message: 'Error while fetching color data',
        placement: 'top',
        duration: 0,
      });
    }
  }, [isColorsError, notification]);

  const checkForUnsavedChanges = useCallback(async (): Promise<boolean> => {
    if (hasUnsavedChanges) {
      const confirmed: boolean = await modal.confirm({
        title: 'Save changes to the color set?',
        content: "If you don't save, changes to the color set may be lost.",
        okText: 'Save',
        cancelText: "Don't save",
        focusTriggerAfterClose: false,
      });
      if (confirmed) {
        saveButtonRef.current?.focus();
      } else {
        setHasUnsavedChanges(false);
      }
      return confirmed;
    }
    return false;
  }, [modal, hasUnsavedChanges]);

  useImperativeHandle(
    ref,
    () => ({
      hasUnsavedChanges: checkForUnsavedChanges,
    }),
    [checkForUnsavedChanges]
  );

  const handleFormValuesChange = (
    changedValues: Partial<ColorSetDefinition>,
    values: ColorSetDefinition
  ) => {
    void (async () => {
      setHasUnsavedChanges(true);

      const emptyColors: Partial<Record<number, number[]>> = getEmptyColors(values);

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
        const [standardColorSetBrand] = values.standardColorSet ?? [];
        const standardColorSet: ColorSetDefinition['standardColorSet'] =
          standardColorSetBrand && !values.brands?.includes(standardColorSetBrand)
            ? undefined
            : values.standardColorSet;

        const colors: Partial<Record<number, number[]>> = {...emptyColors};
        if (values.brands && values.colors) {
          values.brands.forEach((brand: number) => {
            colors[brand] = values.colors![brand] ?? [];
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
            colors[brandId] = standardColorSets.get(brandAlias)?.get(name)?.colors ?? [];

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

  const handleCreateNewClick = async () => {
    if (await checkForUnsavedChanges()) {
      return;
    }
    const emptyColors: Partial<Record<number, number[]>> = getEmptyColors(form.getFieldsValue());
    form.setFieldsValue({
      id: NEW_COLOR_SET,
      name: undefined,
      brands: [],
      standardColorSet: undefined,
      colors: emptyColors,
    });
  };

  const handleSubmit = async (values: ColorSetDefinition) => {
    const {id, ...colorSet} = values;
    form.setFieldsValue(
      await saveColorSet(
        user,
        {
          ...colorSet,
          ...(id ? {id} : {}),
        },
        brands,
        colors
      )
    );
    setHasUnsavedChanges(false);
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
      setHasUnsavedChanges(false);
    }
  };

  const showShareModal = () => {
    setShareColorSetUrl(colorSetToUrl(form.getFieldsValue()));
    setIsShareModalOpen(true);
  };

  return (
    <>
      <Flex vertical gap="small" style={{padding: '0 16px 16px'}}>
        <Space direction="vertical">
          <Typography.Text>
            <Typography.Text strong>ArtistAssistApp</Typography.Text> is a free web app for artists
            to accurately mix any color from a photo, analyze tonal values, turn a photo into an
            outline, draw with the grid method, paint with a limited palette, simplify a photo,
            compare photos pairwise, and more.
          </Typography.Text>
          {!isAuthLoading && !user ? (
            <Typography.Text strong>
              Join ArtistAssistApp on Patreon as a paid member and get full access to all available
              color brands and app features without ads. Or log in with Patreon if you&apos;ve
              already joined.
              <br />
              If you are having trouble logging in, please read this{' '}
              <Typography.Link
                href="https://www.patreon.com/posts/having-trouble-115178129"
                target="_blank"
              >
                guide
              </Typography.Link>
              .
            </Typography.Text>
          ) : (
            <Typography.Text strong>
              Welcome{user?.name && `, ${user.name}`}! Thank you for your support on Patreon.
            </Typography.Text>
          )}
        </Space>

        <Space wrap>
          {!isAuthLoading &&
            (user ? (
              <LogoutButton />
            ) : (
              <>
                <LoginButton />
                <JoinButton />
              </>
            ))}
          {showInstallPromotion && (
            <Button
              icon={<AppstoreAddOutlined />}
              onClick={() => void setActiveTabKey(TabKey.Install)}
            >
              Install
            </Button>
          )}
          <Button
            icon={<QuestionCircleOutlined />}
            onClick={() => void setActiveTabKey(TabKey.Help)}
          >
            Help
          </Button>
        </Space>

        <Divider style={{margin: '8px 0'}} />

        <Typography.Text strong>
          Select your medium, color brands and colors you will paint with and press the{' '}
          <Typography.Link onClick={() => saveButtonRef.current?.focus()}>
            Save & proceed
          </Typography.Link>{' '}
          button.
        </Typography.Text>

        <Spin spinning={isLoading} tip="Loading" indicator={<LoadingOutlined spin />} size="large">
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
                tooltip={`Select from your recent ${COLOR_TYPES.get(selectedType)?.name.toLowerCase()} color sets or create a new one.`}
                rules={[{required: true, message: '${label} is required'}]}
                dependencies={['type']}
              >
                <ColorSetSelect
                  colorSets={colorSetsByType}
                  brands={brands}
                  onCreateNewClick={() => void handleCreateNewClick()}
                />
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
                  extra={
                    !isAccessAllowed ? (
                      <Typography.Text type="warning">
                        You&apos;ve selected color brands that are available to paid Patreon members
                        only.
                      </Typography.Text>
                    ) : (
                      <Typography.Text type="secondary">
                        Only a limited number of color brands are available in the free version.
                      </Typography.Text>
                    )
                  }
                  validateStatus={!isAccessAllowed ? 'warning' : undefined}
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
                  rules={[{required: true, message: '${label} are required'}]}
                  dependencies={['type', 'brands', 'standardColorSet']}
                  tooltip="Add or remove colors to match your actual color set."
                  extra={
                    !isAuthLoading &&
                    !hasAccessToBrand(user, brand) && (
                      <Typography.Text type="warning">
                        This color brand is available to paid Patreon members only.
                      </Typography.Text>
                    )
                  }
                  validateStatus={
                    !isAuthLoading && !hasAccessToBrand(user, brand) ? 'warning' : undefined
                  }
                >
                  <ColorSelect
                    mode="multiple"
                    colors={colors.get(brand.alias)}
                    brand={brand}
                    disabled={!hasAccessToBrand(user, brand)}
                  />
                </Form.Item>
              ))}
            <Row>
              <Col xs={24} md={12}>
                <Form.Item
                  extra={
                    <Space direction="vertical">
                      {!isAccessAllowed && (
                        <Typography.Text type="warning">
                          You&apos;ve selected color brands that are available to paid Patreon
                          members only. Join ArtistAssistApp on Patreon as a paid member or log in
                          with Patreon if you&apos;ve already joined.
                        </Typography.Text>
                      )}
                      {selectedType &&
                        COLOR_MIXING[selectedType].maxColors > 1 &&
                        selectedColorsCount > THREE_COLORS_MIXTURES_LIMIT && (
                          <Typography.Text type="secondary">
                            When selecting more than {THREE_COLORS_MIXTURES_LIMIT} colors in total,
                            mixtures of three colors are not used.
                          </Typography.Text>
                        )}
                      {selectedColorsCount > 0 && (
                        <Typography.Text type="secondary">
                          Press the Share button, copy and save the link so you don&apos;t have to
                          re-enter all the colors.
                        </Typography.Text>
                      )}
                    </Space>
                  }
                >
                  <Space wrap>
                    {!isAuthLoading &&
                      (isAccessAllowed ? (
                        <Tooltip title="Save the changes to the color set" trigger="focus">
                          <Button
                            ref={saveButtonRef}
                            icon={<SaveOutlined />}
                            type="primary"
                            htmlType="submit"
                          >
                            Save & proceed
                          </Button>
                        </Tooltip>
                      ) : (
                        <>
                          <LoginButton />
                          <JoinButton />
                        </>
                      ))}
                    {selectedColorsCount > 0 && (
                      <Button
                        icon={<ShareAltOutlined />}
                        title="Share this color set"
                        onClick={showShareModal}
                      >
                        Share
                      </Button>
                    )}
                    {!!selectedColorSetId && (
                      <Popconfirm
                        title="Delete the color set"
                        description="Are you sure you want to delete this color set?"
                        onConfirm={() => {
                          void handleDeleteButtonClick();
                        }}
                        okText="Yes"
                        cancelText="No"
                      >
                        <Button
                          icon={<DeleteOutlined />}
                          onClick={e => {
                            e.stopPropagation();
                          }}
                        >
                          Delete
                        </Button>
                      </Popconfirm>
                    )}
                  </Space>
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <AdCard />
              </Col>
            </Row>
          </Form>
        </Spin>
      </Flex>
      <ShareModal
        title="Share your color set"
        open={isShareModalOpen}
        setOpen={setIsShareModalOpen}
        url={shareColorSetUrl}
      />
    </>
  );
});
