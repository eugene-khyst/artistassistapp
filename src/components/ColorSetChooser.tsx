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
  CopyOutlined,
  DeleteOutlined,
  MergeCellsOutlined,
  QuestionCircleOutlined,
  SaveOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import {Trans, useLingui} from '@lingui/react/macro';
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
  Typography,
} from 'antd';
import {useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';

import {AdCard} from '@/components/ad/AdCard';
import {JoinButton} from '@/components/auth/JoinButton';
import {LoginEmailOtpButton} from '@/components/auth/LoginEmailOtpButton';
import {LoginOAuthButton} from '@/components/auth/LoginOAuthButton';
import {LoginWithQRButton} from '@/components/auth/LoginWithQRButton';
import {LogoutButton} from '@/components/auth/LogoutButton';
import {ShowLoginQRButton} from '@/components/auth/ShowLoginQRButton';
import {ColorSetSelect} from '@/components/color-set/ColorSetSelect';
import {FileSelect} from '@/components/file/FileSelect';
import {LocaleSelect} from '@/components/i18n/LocaleSelect';
import {InstallButton} from '@/components/install/InstallButton';
import {LoadingIndicator} from '@/components/loading/LoadingIndicator';
import {UnsavedChangesContext} from '@/contexts/UnsavedChangesContext';
import {useColorBrands} from '@/hooks/useColorBrands';
import {useColors} from '@/hooks/useColors';
import {useColorSetBackup} from '@/hooks/useColorSetBackup';
import {usePersistentStorage} from '@/hooks/usePersistentStorage';
import {useStandardColorSets} from '@/hooks/useStandardColorSets';
import {hasAccessTo} from '@/services/auth/utils';
import {COLOR_MIXING, MAX_COLORS_IN_MIXTURE} from '@/services/color/color-mixer';
import {mergeColorSets} from '@/services/color/colors';
import {
  type ColorBrandDefinition,
  type ColorSetDefinition,
  type ColorType,
  CUSTOM_COLOR_SET,
  FileExtension,
  NEW_COLOR_SET,
} from '@/services/color/types';
import {colorSetToUrl} from '@/services/url/url-parser';
import {useAppStore} from '@/stores/app-store';
import {TabKey} from '@/tabs';
import {asyncNoop} from '@/utils/function';

import {ColorBrandSelect} from './color-set/ColorBrandSelect';
import {ColorSelect} from './color-set/ColorSelect';
import {ColorTypeSelect} from './color-set/ColorTypeSelect';
import {MergeColorSetsDrawer} from './color-set/MergeColorSetsDrawer';
import {StandardColorSetCascader} from './color-set/StandardColorSetCascader';
import {ShareModal} from './share/ShareModal';

interface CheckUnsavedOptions {
  updateForm?: boolean;
}

type CheckUnsavedColorSet = (options?: CheckUnsavedOptions) => Promise<void>;

const FIELD = '${label}';

const maxColorsFor2: number = MAX_COLORS_IN_MIXTURE[2];
const maxColorsFor3: number = MAX_COLORS_IN_MIXTURE[3];

const formInitialValues: ColorSetDefinition = {
  id: NEW_COLOR_SET,
  brands: [],
  colors: {},
};

function getEmptyColors(values: ColorSetDefinition): Record<number, number[]> {
  return values.colors
    ? Object.fromEntries(Object.keys(values.colors).map((brand: string) => [brand, []]))
    : {};
}

function getEmptyColorSet(
  values: ColorSetDefinition
): Pick<ColorSetDefinition, 'id' | 'name' | 'brands' | 'standardColorSet' | 'colors'> {
  return {
    id: NEW_COLOR_SET,
    name: undefined,
    brands: [],
    standardColorSet: undefined,
    colors: getEmptyColors(values),
  };
}

function isCompleteColorSet(values?: ColorSetDefinition): boolean {
  return (
    values?.type !== undefined &&
    values.id !== undefined &&
    !!values.brands?.length &&
    !!values.standardColorSet &&
    values.brands.every((brand: number) => (values.colors?.[brand]?.length ?? 0) > 0)
  );
}

export function ColorSetChooser() {
  const user = useAppStore(state => state.auth?.user);
  const isAuthLoading = useAppStore(state => state.isAuthLoading);
  const latestColorSet = useAppStore(state => state.latestColorSet);
  const colorSets = useAppStore(state => state.colorSets);
  const isColorSetsLoading = useAppStore(state => state.isColorSetsLoading);

  const setActiveTabKey = useAppStore(state => state.setActiveTabKey);
  const saveColorSet = useAppStore(state => state.saveColorSet);
  const loadColorSetsFromJson = useAppStore(state => state.loadColorSetsFromJson);
  const deleteColorSet = useAppStore(state => state.deleteColorSet);

  const {registerChecker} = useContext(UnsavedChangesContext);

  const {message, notification, modal} = App.useApp();

  const {t} = useLingui();

  const saveColorSetsAsJsonAndNotify = useColorSetBackup();
  const {requestPersistentStorage, showPersistentStorageWarning, installDrawer} =
    usePersistentStorage();

  const [form] = Form.useForm<ColorSetDefinition>();
  const selectedType = Form.useWatch<ColorType | undefined>('type', form);
  const selectedColorSetId = Form.useWatch<number | undefined>('id', form);
  const selectedBrandIds = Form.useWatch<number[] | undefined>('brands', form);
  const selectedColors = Form.useWatch<Record<number, number[] | undefined> | undefined>(
    'colors',
    form
  );
  const renderedColorSet = Form.useWatch<ColorSetDefinition>([], form);

  const saveButtonRef = useRef<HTMLButtonElement>(null);

  const colorSetsByType: ColorSetDefinition[] = selectedType
    ? (colorSets.get(selectedType) ?? [])
    : [];

  const selectedColorsCount: number = Object.values(selectedColors ?? {})
    .map((ids: number[] | undefined) => ids?.length ?? 0)
    .reduce((a: number, b: number) => a + b, 0);

  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [shareColorSetUrl, setShareColorSetUrl] = useState<string>();
  const [isMergeDrawerOpen, setIsMergeDrawerOpen] = useState<boolean>(false);

  const hasUnsavedChangesRef = useRef<boolean>(false);

  useEffect(() => {
    if (latestColorSet) {
      form.resetFields();
      form.setFieldsValue(latestColorSet);
    }
  }, [form, latestColorSet]);

  const {brands, isLoading: isBrandsLoading, isError: isBrandsError} = useColorBrands(selectedType);

  const selectedBrands: ColorBrandDefinition[] | undefined = useMemo(
    () =>
      selectedBrandIds
        ?.map((id: number) => brands?.get(id))
        .filter((brand): brand is ColorBrandDefinition => !!brand),
    [selectedBrandIds, brands]
  );

  const isAccessAllowed: boolean =
    !selectedBrands || (!isAuthLoading && hasAccessTo(user, selectedBrands));

  const {
    standardColorSets,
    isLoading: isStandardColorSetsLoading,
    isError: isStandardColorSetsError,
  } = useStandardColorSets(selectedType, selectedBrands);

  const {
    colors,
    isLoading: isColorsLoading,
    isError: isColorsError,
  } = useColors(selectedType, selectedBrands);

  const isLoading: boolean =
    isColorSetsLoading ||
    isBrandsLoading ||
    isStandardColorSetsLoading ||
    isColorsLoading ||
    isAuthLoading;

  useEffect(() => {
    if (isBrandsError) {
      notification.error({
        title: t`Error while fetching color brand data`,
        placement: 'top',
        duration: 10,
        showProgress: true,
      });
    }
  }, [isBrandsError, notification, t]);

  useEffect(() => {
    if (isStandardColorSetsError) {
      notification.error({
        title: t`Error while fetching standard color set data`,
        placement: 'top',
        duration: 10,
        showProgress: true,
      });
    }
  }, [isStandardColorSetsError, notification, t]);

  useEffect(() => {
    if (isColorsError) {
      notification.error({
        title: t`Error while fetching color data`,
        placement: 'top',
        duration: 10,
        showProgress: true,
      });
    }
  }, [isColorsError, notification, t]);

  const onCheckUnsavedRef = useRef<CheckUnsavedColorSet>(asyncNoop);
  useEffect(() => {
    onCheckUnsavedRef.current = async ({
      updateForm = true,
    }: CheckUnsavedOptions = {}): Promise<void> => {
      if (!hasUnsavedChangesRef.current) {
        return;
      }
      if (!isCompleteColorSet(renderedColorSet)) {
        void message.warning(
          t`The color set can't be saved because not all required fields are filled.`
        );
        hasUnsavedChangesRef.current = false;
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
        const granted = await requestPersistentStorage();
        const saved = await saveColorSet(renderedColorSet, brands, colors, {
          setActiveTabKey: false,
        });
        if (!saved) {
          void message.warning(
            t`The color set can't be saved because not all required fields are filled.`
          );
          return;
        }
        if (updateForm) {
          form.setFieldsValue(saved);
        }
        await saveColorSetsAsJsonAndNotify();
        if (!granted) {
          showPersistentStorageWarning();
        }
      }
      hasUnsavedChangesRef.current = false;
    };
  });

  const onCheckUnsaved = useCallback(() => onCheckUnsavedRef.current(), []);

  useEffect(() => registerChecker(onCheckUnsaved), [registerChecker, onCheckUnsaved]);

  const handleFormValuesChange = async (
    changedValues: Partial<ColorSetDefinition>,
    values: ColorSetDefinition
  ) => {
    if (changedValues.type !== undefined) {
      await onCheckUnsavedRef.current({updateForm: false});
      form.setFieldsValue(getEmptyColorSet(values));

      const [latestColorSetByType]: ColorSetDefinition[] = colorSets.get(changedValues.type) ?? [];
      if (latestColorSetByType) {
        form.setFieldsValue(latestColorSetByType);
      }
      hasUnsavedChangesRef.current = false;
      return;
    }

    if (changedValues.id !== undefined) {
      await onCheckUnsavedRef.current({updateForm: false});
      form.setFieldsValue(getEmptyColorSet(values));

      if (changedValues.id > 0 && values.type) {
        const colorSet: ColorSetDefinition | undefined = colorSets
          .get(values.type)
          ?.find(({id}: ColorSetDefinition) => id === changedValues.id);
        if (colorSet) {
          form.setFieldsValue(colorSet);
        }
      }
      hasUnsavedChangesRef.current = false;
      return;
    }

    hasUnsavedChangesRef.current = true;
    const emptyColors: Partial<Record<number, number[]>> = getEmptyColors(values);

    if (changedValues.brands) {
      const [standardColorSetBrand] = values.standardColorSet ?? [];
      const standardColorSet: ColorSetDefinition['standardColorSet'] =
        standardColorSetBrand && !values.brands?.includes(standardColorSetBrand)
          ? CUSTOM_COLOR_SET
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
          form.setFieldsValue({
            colors: {
              ...values.colors,
              [brandId]: standardColorSets.get(brandAlias)?.get(name)?.colors ?? [],
            },
          });
        }
      }
    }

    if (changedValues.colors) {
      form.setFieldsValue({
        standardColorSet: CUSTOM_COLOR_SET,
      });
    }
  };

  const handleCreateNewClick = async () => {
    await onCheckUnsavedRef.current({updateForm: false});
    form.setFieldsValue(getEmptyColorSet(form.getFieldsValue()));
  };

  const handleFinish = async (colorSet: ColorSetDefinition) => {
    const granted = await requestPersistentStorage();
    const saved = await saveColorSet(colorSet, brands, colors);
    if (!saved) {
      void message.warning(t`Select at least one color before saving the color set.`);
      return;
    }
    form.setFieldsValue(saved);
    await saveColorSetsAsJsonAndNotify();
    if (!granted) {
      showPersistentStorageWarning();
    }
    hasUnsavedChangesRef.current = false;
  };

  const handleFinishFailed = () => {
    void message.error(t`Fill in the required fields`);
  };

  const handleDuplicateClick = () => {
    hasUnsavedChangesRef.current = true;
    const {id: _id, name: _name, ...colorSet} = form.getFieldsValue();
    const newColorSet: ColorSetDefinition = {
      id: NEW_COLOR_SET,
      name: undefined,
      ...colorSet,
    };
    form.setFieldsValue(newColorSet);
  };

  const handleMergeClick = async () => {
    await onCheckUnsavedRef.current({updateForm: true});
    setIsMergeDrawerOpen(true);
  };

  const handleMerge = (selected: ColorSetDefinition[]) => {
    hasUnsavedChangesRef.current = true;
    const newColorSet: ColorSetDefinition = mergeColorSets(selected);
    form.setFieldsValue(newColorSet);
    setIsMergeDrawerOpen(false);
  };

  const handleDeleteClick = async () => {
    if (!selectedColorSetId) {
      return;
    }
    await deleteColorSet(selectedType, selectedColorSetId);
    form.resetFields();
    form.setFieldsValue({
      type: selectedType,
    });
    hasUnsavedChangesRef.current = false;
  };

  const handleJsonFileChange = async ([file]: File[]) => {
    if (!file) {
      return;
    }
    const colorSet: ColorSetDefinition | undefined = await loadColorSetsFromJson(file);
    if (colorSet) {
      hasUnsavedChangesRef.current = true;
      form.resetFields();
      form.setFieldsValue(colorSet);
    }
  };

  const showShareModal = () => {
    setShareColorSetUrl(colorSetToUrl(form.getFieldsValue()));
    setIsShareModalOpen(true);
  };

  const shouldShowMixtureWarnings: boolean = selectedType
    ? COLOR_MIXING[selectedType].mixing
    : false;

  return (
    <>
      <Flex vertical gap="small" className="u-tab-content">
        <LocaleSelect />

        <Typography.Text>
          <Trans>
            <Typography.Text strong>ArtistAssistApp</Typography.Text> is a web app that helps
            artists mix colors from reference photos, make tonal value studies, outline photos, draw
            with grids, paint with limited palettes, and more.
          </Trans>
        </Typography.Text>

        <Space orientation="vertical" size="small">
          {user ? (
            <>
              <Typography.Text strong>
                <Trans>You are logged in and have access to all app features.</Trans>
              </Typography.Text>

              <Flex gap="small" wrap>
                <ShowLoginQRButton />
                <LogoutButton />
              </Flex>
            </>
          ) : (
            <>
              <Typography.Text>
                <Trans>
                  You are using the <Typography.Text strong>free version</Typography.Text> of
                  ArtistAssistApp. It includes a limited number of color brands and image processing
                  modes.
                </Trans>
              </Typography.Text>

              <Typography.Text>
                <Trans>
                  <Typography.Text strong>Not a paid member yet?</Typography.Text> Become a paid
                  ArtistAssistApp member on Patreon to unlock all paid features, including more than
                  250 color brands and ad-free access.
                  <br />
                  You can continue exploring the free version before deciding to upgrade.
                </Trans>
              </Typography.Text>

              <JoinButton />

              <Typography.Text>
                <Trans>
                  <Typography.Text strong>Already a paid member?</Typography.Text> Log in to unlock
                  your paid features.
                </Trans>
              </Typography.Text>

              <Flex gap="small" wrap>
                <LoginOAuthButton />
                <LoginEmailOtpButton />
                <LoginWithQRButton />
              </Flex>
            </>
          )}
        </Space>

        <Flex gap="small" wrap>
          <InstallButton />
          <Button
            icon={<QuestionCircleOutlined />}
            onClick={() => void setActiveTabKey(TabKey.Help)}
          >
            <Trans>Help & tutorials</Trans>
          </Button>
        </Flex>

        <Divider className="u-divider-compact" />

        <Typography.Text strong>
          <Trans>
            Select your art medium, color brands, and the colors you will paint with, then press{' '}
            <Typography.Link onClick={() => saveButtonRef.current?.focus()}>
              Save & continue
            </Typography.Link>
            .
          </Trans>
        </Typography.Text>

        <LoadingIndicator loading={isLoading}>
          <Form
            name="colorSet"
            form={form}
            initialValues={formInitialValues}
            onValuesChange={(changedValues, values) => {
              void handleFormValuesChange(changedValues, values);
            }}
            onFinish={values => {
              void handleFinish(values);
            }}
            onFinishFailed={handleFinishFailed}
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
                const brandName: string = brand.shortName || brand.fullName;
                const hasAccess: boolean = hasAccessTo(user, brand);
                return (
                  <Form.Item
                    key={brand.id}
                    name={['colors', brand.id.toString()]}
                    label={t`${brandName} colors`}
                    rules={[{required: true, message: t`${FIELD} are required`}]}
                    dependencies={['type', 'brands', 'standardColorSet']}
                    tooltip={t`Add or remove colors to match your actual color set.`}
                    extra={
                      !hasAccess && (
                        <Typography.Text type="warning">
                          <Trans>This color brand is available to paid Patreon members only</Trans>
                        </Typography.Text>
                      )
                    }
                    validateStatus={!hasAccess ? 'warning' : undefined}
                  >
                    <ColorSelect
                      mode="multiple"
                      colors={colors.get(brand.alias)}
                      brand={brand}
                      disabled={!hasAccess}
                    />
                  </Form.Item>
                );
              })}

            <Form.Item
              extra={
                <Space orientation="vertical">
                  {!isAccessAllowed && (
                    <Typography.Text type="warning">
                      <Trans>
                        You&apos;ve selected color brands that are available to paid Patreon members
                        only. Join ArtistAssistApp on Patreon as a paid member or log in with
                        Patreon if you&apos;ve already joined.
                      </Trans>
                    </Typography.Text>
                  )}
                  {shouldShowMixtureWarnings && selectedColorsCount > maxColorsFor2 && (
                    <Typography.Text type="secondary">
                      <Trans>
                        When selecting more than {maxColorsFor2} colors in total, mixtures of two
                        colors are not used.
                      </Trans>
                    </Typography.Text>
                  )}
                  {shouldShowMixtureWarnings && selectedColorsCount > maxColorsFor3 && (
                    <Typography.Text type="secondary">
                      <Trans>
                        When selecting more than {maxColorsFor3} colors in total, mixtures of three
                        colors are not used.
                      </Trans>
                    </Typography.Text>
                  )}
                </Space>
              }
              className="u-mb-0"
            >
              <Flex gap="small" wrap>
                {isAccessAllowed ? (
                  <>
                    <Button
                      ref={saveButtonRef}
                      icon={<SaveOutlined />}
                      title={t`Save the changes to this color set`}
                      type="primary"
                      htmlType="submit"
                    >
                      <Trans>Save & continue</Trans>
                    </Button>
                    {!!selectedColorSetId && (
                      <Button
                        icon={<CopyOutlined />}
                        title={t`Create a duplicate of this color set for further modification`}
                        onClick={handleDuplicateClick}
                      >
                        <Trans>Duplicate</Trans>
                      </Button>
                    )}
                    {colorSetsByType.length >= 2 && (
                      <Button
                        icon={<MergeCellsOutlined />}
                        title={t`Create a new color set by merging existing ones`}
                        onClick={() => void handleMergeClick()}
                      >
                        <Trans>Merge</Trans>
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <JoinButton />
                    <LoginOAuthButton />
                    <LoginEmailOtpButton />
                    <LoginWithQRButton />
                  </>
                )}
                {!!selectedColorSetId && (
                  <Popconfirm
                    title={t`Delete the color set`}
                    description={t`Are you sure you want to delete this color set?`}
                    onConfirm={() => {
                      void handleDeleteClick();
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
                )}
                {selectedColorsCount > 0 && (
                  <Button
                    icon={<ShareAltOutlined />}
                    title={t`Share this color set`}
                    onClick={showShareModal}
                  >
                    <Trans>Share</Trans>
                  </Button>
                )}
                <FileSelect
                  type="default"
                  accept={{'application/json': [FileExtension.ColorSet, '.json']}}
                  onChange={(files: File[]) => void handleJsonFileChange(files)}
                >
                  <Trans>Load color sets file</Trans>
                </FileSelect>
              </Flex>
            </Form.Item>
          </Form>
        </LoadingIndicator>

        <Row justify="start">
          <Col xs={24} md={12}>
            <AdCard />
          </Col>
        </Row>
      </Flex>

      <ShareModal open={isShareModalOpen} setOpen={setIsShareModalOpen} url={shareColorSetUrl} />
      <MergeColorSetsDrawer
        open={isMergeDrawerOpen}
        onClose={() => {
          setIsMergeDrawerOpen(false);
        }}
        colorSets={colorSetsByType}
        brands={brands}
        onMerge={handleMerge}
      />
      {installDrawer}
    </>
  );
}
