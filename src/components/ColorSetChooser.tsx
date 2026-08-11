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
import {useEffect, useMemo, useRef, useState} from 'react';

import {AdCard} from '@/components/ad/AdCard';
import {JoinButton} from '@/components/auth/JoinButton';
import {LoginEmailOtpButton} from '@/components/auth/LoginEmailOtpButton';
import {LoginOAuthButton} from '@/components/auth/LoginOAuthButton';
import {LogoutButton} from '@/components/auth/LogoutButton';
import {ConnectCloudButton} from '@/components/cloud/ConnectCloudButton';
import {DisconnectCloudButton} from '@/components/cloud/DisconnectCloudButton';
import {ExportToZipButton} from '@/components/cloud/ExportToZipButton';
import {ImportFromZipFileSelect} from '@/components/cloud/ImportFromZipFileSelect';
import {SyncCloudButton} from '@/components/cloud/SyncCloudButton';
import {ColorSetSelect} from '@/components/color-set/ColorSetSelect';
import {LocaleSelect} from '@/components/i18n/LocaleSelect';
import {InstallButton} from '@/components/install/InstallButton';
import {LoadingIndicator} from '@/components/loading/LoadingIndicator';
import {useColorBrands} from '@/hooks/useColorBrands';
import {useColors} from '@/hooks/useColors';
import {useErrorNotification} from '@/hooks/useErrorNotification';
import {usePersistentStorage} from '@/hooks/usePersistentStorage';
import {useStandardColorSets} from '@/hooks/useStandardColorSets';
import {hasAccessTo} from '@/services/auth/utils';
import {CloudProvider} from '@/services/cloud/types';
import {COLOR_MIXING, MAX_COLORS_IN_MIXTURE} from '@/services/color/color-mixer';
import {mergeColorSets} from '@/services/color/colors';
import {
  type ColorBrandDefinition,
  type ColorSetDefinition,
  type ColorType,
  CUSTOM_COLOR_SET,
  NEW_COLOR_SET,
} from '@/services/color/types';
import {colorSetToUrl} from '@/services/url/url-parser';
import {useAppStore} from '@/stores/app-store';
import {TabKey} from '@/tabs';

import {ColorBrandSelect} from './color-set/ColorBrandSelect';
import {ColorSelect} from './color-set/ColorSelect';
import {ColorTypeSelect} from './color-set/ColorTypeSelect';
import {MergeColorSetsDrawer} from './color-set/MergeColorSetsDrawer';
import {StandardColorSetCascader} from './color-set/StandardColorSetCascader';
import styles from './ColorSetChooser.module.css';
import {ShareModal} from './share/ShareModal';

interface CheckUnsavedOptions {
  updateForm?: boolean;
}

type CheckUnsavedColorSet = (options?: CheckUnsavedOptions) => Promise<boolean>;

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
  const isCloudConnected = useAppStore(state => !!state.cloudConnection);
  const isAuthLoading = useAppStore(state => state.isAuthLoading);
  const colorSets = useAppStore(state => state.colorSets);
  const colorSetsReloadRevision = useAppStore(state => state.colorSetsReloadRevision);
  const isColorSetsLoading = useAppStore(state => state.isColorSetsLoading);

  const getLatestColorSet = useAppStore(state => state.getLatestColorSet);
  const setActiveTabKey = useAppStore(state => state.setActiveTabKey);
  const registerUnsavedChangesChecker = useAppStore(state => state.registerUnsavedChangesChecker);
  const saveColorSet = useAppStore(state => state.saveColorSet);
  const deleteColorSet = useAppStore(state => state.deleteColorSet);

  const {message, modal} = App.useApp();

  const {t} = useLingui();

  const {requestPersistentStorage, showStorageNotification, installDrawer} = usePersistentStorage();

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

  const isLoading: boolean = isColorSetsLoading || isBrandsLoading;

  // Without the brand and color data, saving drops colors silently or skips activation entirely.
  const isColorDataUnavailable: boolean = isColorsLoading || isColorsError || isBrandsError;
  const warnColorDataUnavailable = () => {
    if (isColorsLoading) {
      void message.warning(<Trans>Wait for the color data to finish loading.</Trans>);
    } else {
      void message.error(
        <Trans>The color set can&apos;t be saved because the color data failed to load.</Trans>
      );
    }
  };

  useErrorNotification(isBrandsError, <Trans>Error while fetching color brand data</Trans>);
  useErrorNotification(
    isStandardColorSetsError,
    <Trans>Error while fetching standard color set data</Trans>
  );
  useErrorNotification(isColorsError, <Trans>Error while fetching color data</Trans>);

  const onCheckUnsavedRef = useRef<CheckUnsavedColorSet>(() => Promise.resolve(true));
  useEffect(() => {
    onCheckUnsavedRef.current = async ({
      updateForm = true,
    }: CheckUnsavedOptions = {}): Promise<boolean> => {
      if (!hasUnsavedChangesRef.current) {
        return true;
      }
      if (!isCompleteColorSet(renderedColorSet)) {
        const confirmed: boolean = await modal.confirm({
          title: <Trans>Discard changes to the color set?</Trans>,
          content: (
            <Trans>
              The color set can&apos;t be saved because not all required fields are filled.
            </Trans>
          ),
          okText: <Trans>Discard changes</Trans>,
          cancelText: <Trans>Keep editing</Trans>,
          okButtonProps: {danger: true},
          focusTriggerAfterClose: false,
        });
        if (!confirmed) {
          return false;
        }
        hasUnsavedChangesRef.current = false;
        return true;
      }
      const confirmed: boolean = await modal.confirm({
        title: <Trans>Save changes to the color set?</Trans>,
        content: <Trans>If you don&apos;t save, changes to the color set may be lost.</Trans>,
        okText: <Trans>Save</Trans>,
        cancelText: <Trans>Don&apos;t save</Trans>,
        focusTriggerAfterClose: false,
      });
      if (confirmed) {
        if (isColorDataUnavailable) {
          warnColorDataUnavailable();
          return false;
        }
        const granted = await requestPersistentStorage();
        const saved = await saveColorSet(renderedColorSet, brands, colors, {
          setActiveTabKey: false,
        });
        if (!saved) {
          void message.warning(
            <Trans>
              The color set can&apos;t be saved because not all required fields are filled.
            </Trans>
          );
          return false;
        }
        if (updateForm) {
          form.setFieldsValue(saved);
        }
        showStorageNotification(granted);
      }
      hasUnsavedChangesRef.current = false;
      return true;
    };
  });

  useEffect(
    () => registerUnsavedChangesChecker(TabKey.ColorSet, () => onCheckUnsavedRef.current()),
    [registerUnsavedChangesChecker]
  );

  // External reloads may replace the form, while in-form saves must preserve current edits.
  const prefilledReloadRevisionRef = useRef(0);
  useEffect(() => {
    if (prefilledReloadRevisionRef.current === colorSetsReloadRevision) {
      return;
    }
    prefilledReloadRevisionRef.current = colorSetsReloadRevision;
    void (async () => {
      if (!(await onCheckUnsavedRef.current({updateForm: false}))) {
        return;
      }
      const latestColorSet = getLatestColorSet();
      form.resetFields();
      if (latestColorSet) {
        form.setFieldsValue(latestColorSet);
      }
    })();
  }, [form, getLatestColorSet, colorSetsReloadRevision]);

  const handleFormValuesChange = async (
    changedValues: Partial<ColorSetDefinition>,
    values: ColorSetDefinition
  ) => {
    const previousColorSet = renderedColorSet;
    if (changedValues.type !== undefined) {
      if (!(await onCheckUnsavedRef.current({updateForm: false}))) {
        form.setFieldsValue(previousColorSet);
        return;
      }
      form.setFieldsValue(getEmptyColorSet(values));

      const [latestColorSetByType]: ColorSetDefinition[] = colorSets.get(changedValues.type) ?? [];
      if (latestColorSetByType) {
        form.setFieldsValue(latestColorSetByType);
      }
      hasUnsavedChangesRef.current = false;
      return;
    }

    if (changedValues.id !== undefined) {
      if (!(await onCheckUnsavedRef.current({updateForm: false}))) {
        form.setFieldsValue(previousColorSet);
        return;
      }
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
    if (!(await onCheckUnsavedRef.current({updateForm: false}))) {
      return;
    }
    form.setFieldsValue(getEmptyColorSet(form.getFieldsValue()));
  };

  const handleFinish = async (colorSet: ColorSetDefinition) => {
    if (isColorDataUnavailable) {
      warnColorDataUnavailable();
      return;
    }
    const granted = await requestPersistentStorage();
    const saved = await saveColorSet(colorSet, brands, colors);
    if (!saved) {
      void message.warning(<Trans>Select at least one color before saving the color set.</Trans>);
      return;
    }
    form.setFieldsValue(saved);
    showStorageNotification(granted);
    hasUnsavedChangesRef.current = false;
  };

  const handleFinishFailed = () => {
    void message.error(<Trans>Fill in the required fields</Trans>);
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
    if (!(await onCheckUnsavedRef.current({updateForm: true}))) {
      return;
    }
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
        <Flex gap="small" wrap>
          <LocaleSelect />
          <InstallButton />
          <Button
            icon={<QuestionCircleOutlined />}
            onClick={() => void setActiveTabKey(TabKey.Help)}
          >
            <Trans>Help</Trans>
          </Button>
        </Flex>

        <Typography.Paragraph className="u-m-0">
          <Trans>
            <Typography.Text strong>ArtistAssistApp</Typography.Text> helps artists mix colors to
            match reference photos using their own art supplies, create palettes and mixing charts,
            study tonal values, make outlines, draw with grids, explore limited palettes and
            artist-inspired versions of photos, straighten photos, adjust their colors, remove
            backgrounds, and compare photos side by side.
          </Trans>
        </Typography.Paragraph>

        <Space orientation="vertical" size="small">
          {user ? (
            <>
              <Typography.Text strong>
                <Trans>You are logged in and have access to all app features.</Trans>
              </Typography.Text>

              <Flex gap="small" wrap>
                <LogoutButton />
                <SyncCloudButton />
                <DisconnectCloudButton />
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

              <Typography component="div" className="u-m-0">
                <Typography.Text>
                  <Trans>
                    <Typography.Text strong>Not a paid member yet?</Typography.Text> Become a paid
                    ArtistAssistApp member to unlock:
                  </Trans>
                </Typography.Text>
                <ul className={styles['memberBenefits']}>
                  <li>
                    <Trans>🎨 250+ color brands</Trans>
                  </li>
                  <li>
                    <Trans>✏️ High-quality outlines and background removal</Trans>
                  </li>
                  <li>
                    <Trans>🧑‍🎨 Artist-inspired and custom-reference styles</Trans>
                  </li>
                  <li>
                    <Trans>
                      ☁️ Cloud sync to store your color sets, photos, and mixtures in your own cloud
                      storage, so you can use them across devices
                    </Trans>
                  </li>
                  <li>
                    <Trans>📢 No ads</Trans>
                  </li>
                </ul>
              </Typography>

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
              </Flex>
            </>
          )}
        </Space>

        {user && !isCloudConnected && (
          <Space orientation="vertical" size="small">
            <Typography.Text>
              <Trans>Connect cloud storage to synchronize your data across devices.</Trans>
            </Typography.Text>
            <Flex gap="small" wrap>
              <ConnectCloudButton provider={CloudProvider.Google} />
              <ConnectCloudButton provider={CloudProvider.Microsoft} />
              <ConnectCloudButton provider={CloudProvider.Dropbox} />
            </Flex>
            <Typography.Text>
              <Trans>Or save a backup file on this device.</Trans>
            </Typography.Text>
            <Flex gap="small" wrap>
              <ExportToZipButton />
              <ImportFromZipFileSelect />
            </Flex>
          </Space>
        )}

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
              label={<Trans>Art medium</Trans>}
              rules={[{required: true, message: t`Select an art medium`}]}
            >
              <ColorTypeSelect />
            </Form.Item>
            {!!selectedType && (
              <Form.Item
                name="id"
                label={<Trans>Color set</Trans>}
                tooltip={<Trans>Select from your recent color sets or create a new one.</Trans>}
                rules={[{required: true, message: t`Select a color set`}]}
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
                  label={<Trans>Name</Trans>}
                  tooltip={<Trans>Give your color set a name for easy access.</Trans>}
                  dependencies={['type']}
                >
                  <Input placeholder={t`Name a color set`} />
                </Form.Item>
                <Form.Item
                  name="brands"
                  label={<Trans>Color brands</Trans>}
                  tooltip={<Trans>Select brands that you use.</Trans>}
                  rules={[{required: true, message: t`Select at least one color brand`}]}
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
                label={<Trans>Standard color set</Trans>}
                rules={[{required: true, message: t`Select a standard or custom color set`}]}
                dependencies={['type', 'brands']}
                tooltip={<Trans>Do you have a store-bought or custom color set?</Trans>}
              >
                <StandardColorSetCascader
                  brands={selectedBrands}
                  standardColorSets={standardColorSets}
                  loading={isStandardColorSetsLoading}
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
                    label={<Trans>{brandName} colors</Trans>}
                    rules={[{required: true, message: t`Select at least one color`}]}
                    dependencies={['type', 'brands', 'standardColorSet']}
                    tooltip={<Trans>Add or remove colors to match your actual color set.</Trans>}
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
                      loading={isColorsLoading}
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
                      disabled={isColorDataUnavailable}
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
                  </>
                )}
                {!!selectedColorSetId && (
                  <Popconfirm
                    title={<Trans>Delete the color set</Trans>}
                    description={<Trans>Are you sure you want to delete this color set?</Trans>}
                    onConfirm={() => {
                      void handleDeleteClick();
                    }}
                    okText={<Trans>Delete</Trans>}
                    cancelText={<Trans>Keep</Trans>}
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
