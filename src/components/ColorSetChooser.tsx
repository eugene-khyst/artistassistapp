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

import {
  AppstoreAddOutlined,
  CopyOutlined,
  DeleteOutlined,
  LoadingOutlined,
  QrcodeOutlined,
  QuestionCircleOutlined,
  SaveOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import {Trans, useLingui} from '@lingui/react/macro';
import {useDevices} from '@yudiel/react-qr-scanner';
import {
  App,
  Button,
  Col,
  Collapse,
  Divider,
  Flex,
  Form,
  Input,
  Popconfirm,
  Row,
  Space,
  Spin,
  Typography,
} from 'antd';
import type {ForwardedRef} from 'react';
import {forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState} from 'react';

import {AdCard} from '~/src/components/ad/AdCard';
import {JoinButton} from '~/src/components/auth/JoinButton';
import {LoginButton} from '~/src/components/auth/LoginButton';
import {LogoutButton} from '~/src/components/auth/LogoutButton';
import {ColorSetSelect} from '~/src/components/color-set/ColorSetSelect';
import {LocaleSelect} from '~/src/components/i18n/LocaleSelect';
import {PERSISTENT_STORAGE_WARN} from '~/src/components/messages';
import {QRCode} from '~/src/components/qr/QRCode';
import {QRScannerModal} from '~/src/components/qr/QRScannerModal';
import type {ChangableComponent} from '~/src/components/types';
import {useColorBrands} from '~/src/hooks/useColorBrands';
import {useColors} from '~/src/hooks/useColors';
import {useStandardColorSets} from '~/src/hooks/useStandardColorSets';
import {hasAccessTo} from '~/src/services/auth/utils';
import {MAX_COLORS_IN_MIXTURE} from '~/src/services/color/color-mixer';
import {compareByDate} from '~/src/services/color/colors';
import type {ColorBrandDefinition, ColorSetDefinition, ColorType} from '~/src/services/color/types';
import {colorSetToUrl} from '~/src/services/url/url-parser';
import {useAppStore} from '~/src/stores/app-store';
import {TabKey} from '~/src/tabs';
import {reverseOrder} from '~/src/utils/array';
import {requestPersistentStorage} from '~/src/utils/storage';

import {ColorBrandSelect} from './color-set/ColorBrandSelect';
import {ColorSelect} from './color-set/ColorSelect';
import {ColorTypeSelect} from './color-set/ColorTypeSelect';
import {StandardColorSetCascader} from './color-set/StandardColorSetCascader';
import {ShareModal} from './share/ShareModal';

const FIELD = '${label}';

const NEW_COLOR_SET = 0;
const CUSTOM_COLOR_SET = [0];

const formInitialValues: ColorSetDefinition = {
  id: NEW_COLOR_SET,
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
  const user = useAppStore(state => state.auth?.user);
  const magicLink = useAppStore(state => state.auth?.magicLink);
  const isAuthLoading = useAppStore(state => state.isAuthLoading);
  const importedColorSet = useAppStore(state => state.importedColorSet);
  const latestColorSet = useAppStore(state => state.latestColorSet);
  const colorSetsByType = useAppStore(state => state.colorSetsByType);
  const isColorSetsByTypeLoading = useAppStore(state => state.isColorSetsByTypeLoading);

  const setActiveTabKey = useAppStore(state => state.setActiveTabKey);
  const loadColorSetsByType = useAppStore(state => state.loadColorSetsByType);
  const saveColorSet = useAppStore(state => state.saveColorSet);
  const deleteColorSet = useAppStore(state => state.deleteColorSet);

  const {message, notification, modal} = App.useApp();

  const {t} = useLingui();

  const mediaDevices: MediaDeviceInfo[] = useDevices();

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
  const [isQRScannerModalOpen, setIsQRScannerModalOpen] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [shareColorSetUrl, setShareColorSetUrl] = useState<string>();

  useEffect(() => {
    if (importedColorSet) {
      form.setFieldsValue(importedColorSet);
      setHasUnsavedChanges(true);
    } else if (latestColorSet) {
      form.setFieldsValue(latestColorSet);
    }
  }, [form, importedColorSet, latestColorSet]);

  const {brands, isLoading: isBrandsLoading, isError: isBrandsError} = useColorBrands(selectedType);

  const selectedBrands: ColorBrandDefinition[] | undefined = selectedBrandIds
    ?.map((id: number) => brands?.get(id))
    .filter((brand): brand is ColorBrandDefinition => !!brand);

  const isAccessAllowed: boolean =
    !selectedBrands || (!isAuthLoading && hasAccessTo(user, selectedBrands));

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
    isColorSetsByTypeLoading ||
    isBrandsLoading ||
    isStandardColorSetsLoading ||
    isColorsLoading ||
    isAuthLoading;

  useEffect(() => {
    if (isBrandsError) {
      notification.error({
        message: t`Error while fetching color brand data`,
        placement: 'top',
        duration: 0,
      });
    }
  }, [isBrandsError, notification, t]);

  useEffect(() => {
    if (isStandardColorSetsError) {
      notification.error({
        message: t`Error while fetching standard color set data`,
        placement: 'top',
        duration: 0,
      });
    }
  }, [isStandardColorSetsError, notification, t]);

  useEffect(() => {
    if (isColorsError) {
      notification.error({
        message: t`Error while fetching color data`,
        placement: 'top',
        duration: 0,
      });
    }
  }, [isColorsError, notification, t]);

  const checkForUnsavedChanges = useCallback(async (): Promise<void> => {
    if (!hasUnsavedChanges) {
      return;
    }
    const confirmed: boolean = await modal.confirm({
      title: t`Save changes to the color set?`,
      content: t`If you don't save, changes to the color set may be lost.`,
      okText: t`Yes`,
      cancelText: t`No`,
      focusTriggerAfterClose: false,
    });
    if (confirmed) {
      const {id, ...colorSet} = form.getFieldsValue();
      form.setFieldsValue(
        await saveColorSet(
          {
            ...colorSet,
            ...(id ? {id} : {}),
          },
          brands,
          colors,
          user,
          false
        )
      );
    }
    setHasUnsavedChanges(false);
  }, [modal, form, brands, colors, user, saveColorSet, hasUnsavedChanges, t]);

  useImperativeHandle(
    ref,
    () => ({
      checkForUnsavedChanges,
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

        const [latestColorSetsByType]: ColorSetDefinition[] = (
          await loadColorSetsByType(changedValues.type)
        ).sort(reverseOrder(compareByDate));
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
    await checkForUnsavedChanges();
    const emptyColors: Partial<Record<number, number[]>> = getEmptyColors(form.getFieldsValue());
    form.setFieldsValue({
      id: NEW_COLOR_SET,
      name: undefined,
      brands: [],
      standardColorSet: undefined,
      colors: emptyColors,
    });
  };

  const handleSubmit = async ({id, ...colorSet}: ColorSetDefinition) => {
    if (!(await requestPersistentStorage())) {
      const {title, content} = PERSISTENT_STORAGE_WARN;
      await modal.warning({
        title: t(title),
        content: t(content),
      });
    }
    setHasUnsavedChanges(false);
    form.setFieldsValue(
      await saveColorSet(
        {
          ...colorSet,
          ...(id ? {id} : {}),
        },
        brands,
        colors,
        user
      )
    );
  };

  const handleSubmitFailed = () => {
    void message.error(t`Fill in the required fields`);
  };

  const handleDuplicateButtonClick = () => {
    const {id: _id, name: _name, ...colorSet} = form.getFieldsValue();
    form.setFieldsValue({
      id: NEW_COLOR_SET,
      name: undefined,
      ...colorSet,
    });
    setHasUnsavedChanges(true);
  };

  const handleDeleteButtonClick = async () => {
    setHasUnsavedChanges(true);
    if (selectedColorSetId) {
      await deleteColorSet(selectedColorSetId);
      let values: Partial<ColorSetDefinition> = {
        type: selectedType,
      };
      if (selectedType) {
        const [latestColorSetsByType] = (await loadColorSetsByType(selectedType)).sort(
          reverseOrder(compareByDate)
        );
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

  const maxColorsFor2: number = MAX_COLORS_IN_MIXTURE[2];
  const maxColorsFor3: number = MAX_COLORS_IN_MIXTURE[2];

  return (
    <>
      <Flex vertical gap="small" style={{padding: '0 16px 16px'}}>
        <LocaleSelect />

        <Typography.Text>
          <Trans>
            <Typography.Text strong>ArtistAssistApp</Typography.Text> is a web app that helps
            artists to mix colors from photos, analyze tonal values, outline photos, draw with
            grids, paint with limited palettes, and more.
          </Trans>
        </Typography.Text>

        <Space direction="vertical" size={0}>
          {!isAuthLoading &&
            (user ? (
              <Typography.Text strong>
                <Trans>You are logged in and have access to all app features.</Trans>
              </Typography.Text>
            ) : (
              <>
                <Typography.Text>
                  <Trans>
                    You are using the <Typography.Text strong>free version</Typography.Text> with a
                    limited number of color brands and image processing modes.
                  </Trans>
                </Typography.Text>
                <Typography.Text>
                  <Trans>
                    <Typography.Text strong>
                      Join ArtistAssistApp on Patreon as a paid member
                    </Typography.Text>
                    , or <Typography.Text strong>log in with Patreon</Typography.Text> if
                    you&apos;ve already joined, to get access to more than 200 color brands and all
                    image processing modes without ads.
                  </Trans>
                </Typography.Text>
                <Typography.Text>
                  <Trans>
                    Explore the free version before deciding to purchase a paid membership.
                  </Trans>
                </Typography.Text>
                <Typography.Text strong>
                  <Trans>
                    If you are having trouble logging in, please read this{' '}
                    <Typography.Link
                      href="https://www.patreon.com/posts/having-trouble-115178129"
                      target="_blank"
                      rel="noopener"
                    >
                      guide
                    </Typography.Link>
                    .
                  </Trans>
                </Typography.Text>
              </>
            ))}
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
          {!!mediaDevices.length && (
            <Button
              icon={<QrcodeOutlined />}
              onClick={() => {
                setIsQRScannerModalOpen(true);
              }}
            >
              <Trans>Scan QR code</Trans>
            </Button>
          )}
          {showInstallPromotion && (
            <Button
              icon={<AppstoreAddOutlined />}
              onClick={() => void setActiveTabKey(TabKey.Install)}
            >
              <Trans>Install</Trans>
            </Button>
          )}
          <Button
            type="primary"
            icon={<QuestionCircleOutlined />}
            onClick={() => void setActiveTabKey(TabKey.Help)}
          >
            <Trans>Help</Trans>
          </Button>
        </Space>

        {magicLink && (
          <Collapse
            ghost
            items={[
              {
                key: '1',
                label: t`Log in on another device by scanning the QR code`,
                children: <QRCode value={magicLink} />,
              },
            ]}
          />
        )}

        <Divider style={{margin: '8px 0'}} />

        <Typography.Text strong>
          <Trans>
            Select your art medium, color brands and colors you will paint with and press the{' '}
            <Typography.Link onClick={() => saveButtonRef.current?.focus()}>
              Save & proceed
            </Typography.Link>{' '}
            button.
          </Trans>
        </Typography.Text>

        <Spin spinning={isLoading} indicator={<LoadingOutlined spin />} size="large">
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
              label={t`Art medium`}
              rules={[{required: true, message: t`${FIELD} is required`}]}
            >
              <ColorTypeSelect />
            </Form.Item>
            {!!selectedType && (
              <Form.Item
                name="id"
                label={t`Color set`}
                tooltip={t`Select from your recent color sets or create a new one.`}
                rules={[{required: true, message: t`${FIELD} is required`}]}
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
                  label={t`Name`}
                  tooltip={t`Give your color set a name for easy access.`}
                  dependencies={['type']}
                >
                  <Input placeholder={t`Name a color set`} />
                </Form.Item>
                <Form.Item
                  name="brands"
                  label={t`Color brands`}
                  tooltip={t`Select brands that you use.`}
                  rules={[{required: true, message: t`${FIELD} are required`}]}
                  dependencies={['type']}
                  extra={
                    !user &&
                    (!isAccessAllowed ? (
                      <Typography.Text type="warning">
                        <Trans>
                          You&apos;ve selected color brands that are available to paid Patreon
                          members only
                        </Trans>
                      </Typography.Text>
                    ) : (
                      <Typography.Text type="secondary">
                        <Trans>
                          Only a limited number of color brands are available in the free version
                        </Trans>
                      </Typography.Text>
                    ))
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
                label={t`Standard color set`}
                rules={[{required: true, message: t`${FIELD} is required`}]}
                dependencies={['type', 'brands']}
                tooltip={t`Do you have a store-bought or custom color set?`}
              >
                <StandardColorSetCascader
                  brands={selectedBrands}
                  standardColorSets={standardColorSets}
                />
              </Form.Item>
            )}
            {!!selectedType &&
              selectedBrands?.map((brand: ColorBrandDefinition) => {
                const brandName = brand.shortName || brand.fullName;
                return (
                  <Form.Item
                    key={brand.id}
                    name={['colors', brand.id.toString()]}
                    label={t`${brandName} colors`}
                    rules={[{required: true, message: t`${FIELD} are required`}]}
                    dependencies={['type', 'brands', 'standardColorSet']}
                    tooltip={t`Add or remove colors to match your actual color set.`}
                    extra={
                      !isAuthLoading &&
                      !hasAccessTo(user, brand) && (
                        <Typography.Text type="warning">
                          <Trans>This color brand is available to paid Patreon members only</Trans>
                        </Typography.Text>
                      )
                    }
                    validateStatus={
                      !isAuthLoading && !hasAccessTo(user, brand) ? 'warning' : undefined
                    }
                  >
                    <ColorSelect
                      mode="multiple"
                      colors={colors.get(brand.alias)}
                      brand={brand}
                      disabled={!hasAccessTo(user, brand)}
                    />
                  </Form.Item>
                );
              })}

            <Form.Item
              extra={
                <Space direction="vertical">
                  {!isAccessAllowed && (
                    <Typography.Text type="warning">
                      <Trans>
                        You&apos;ve selected color brands that are available to paid Patreon members
                        only. Join ArtistAssistApp on Patreon as a paid member or log in with
                        Patreon if you&apos;ve already joined.
                      </Trans>
                    </Typography.Text>
                  )}
                  {selectedColorsCount > maxColorsFor2 && (
                    <Typography.Text type="secondary">
                      <Trans>
                        When selecting more than {maxColorsFor2} colors in total, mixtures of two
                        colors are not used.
                      </Trans>
                    </Typography.Text>
                  )}
                  {selectedColorsCount > maxColorsFor3 && (
                    <Typography.Text type="secondary">
                      <Trans>
                        When selecting more than {maxColorsFor3} colors in total, mixtures of three
                        colors are not used.
                      </Trans>
                    </Typography.Text>
                  )}
                  {selectedColorsCount > 0 && (
                    <Typography.Text type="secondary">
                      <Trans>
                        Press the Share button, copy and save the link so you don&apos;t have to
                        re-enter all the colors.
                      </Trans>
                    </Typography.Text>
                  )}
                </Space>
              }
              style={{marginBottom: 0}}
            >
              <Space wrap>
                {!isAuthLoading &&
                  (isAccessAllowed ? (
                    <Button
                      ref={saveButtonRef}
                      icon={<SaveOutlined />}
                      title={t`Save the changes to this color set`}
                      type="primary"
                      htmlType="submit"
                    >
                      <Trans>Save & proceed</Trans>
                    </Button>
                  ) : (
                    <>
                      <LoginButton />
                      <JoinButton />
                    </>
                  ))}
                {selectedColorsCount > 0 && (
                  <Button
                    icon={<ShareAltOutlined />}
                    title={t`Share this color set`}
                    onClick={showShareModal}
                  >
                    <Trans>Share</Trans>
                  </Button>
                )}
                {!!selectedColorSetId && (
                  <>
                    <Button
                      icon={<CopyOutlined />}
                      title={t`Create a duplicate of this color set for further modification`}
                      onClick={handleDuplicateButtonClick}
                    >
                      <Trans>Duplicate</Trans>
                    </Button>
                    <Popconfirm
                      title={t`Delete the color set`}
                      description={t`Are you sure you want to delete this color set?`}
                      onConfirm={() => {
                        void handleDeleteButtonClick();
                      }}
                      okText={t`Yes`}
                      cancelText={t`No`}
                    >
                      <Button
                        icon={<DeleteOutlined />}
                        title={t`Delete this color set`}
                        onClick={e => {
                          e.stopPropagation();
                        }}
                      >
                        <Trans>Delete</Trans>
                      </Button>
                    </Popconfirm>
                  </>
                )}
              </Space>
            </Form.Item>
          </Form>
        </Spin>

        <Row justify="start">
          <Col xs={24} md={12}>
            <AdCard />
          </Col>
        </Row>
      </Flex>

      <QRScannerModal open={isQRScannerModalOpen} setOpen={setIsQRScannerModalOpen} />
      <ShareModal open={isShareModalOpen} setOpen={setIsShareModalOpen} url={shareColorSetUrl} />
    </>
  );
});
