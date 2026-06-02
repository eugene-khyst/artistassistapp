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

import {useLingui} from '@lingui/react/macro';
import {App} from 'antd';
import {useCallback, useEffect, useMemo, useState} from 'react';

import {useOnnxModels} from '@/hooks/useOnnxModels';
import {hasAccessTo} from '@/services/auth/utils';
import {compareOnnxModelsByPriority, getDefaultModel} from '@/services/ml/models';
import type {OnnxModel, OnnxModelType} from '@/services/ml/types';
import type {AppSettings} from '@/services/settings/types';
import {useAppStore} from '@/stores/app-store';

type ModelSettingsKey = keyof Pick<
  AppSettings,
  'outlineModel' | 'backgroundRemovalModel' | 'styleTransferModel'
>;

interface Options {
  type: OnnxModelType;
  settingsKey: ModelSettingsKey;
  setModel: (model?: OnnxModel) => void;
  defaultPredicate?: (model: OnnxModel) => boolean;
}

interface SelectedOnnxModel {
  models?: Map<string, OnnxModel>;
  sortedModels: OnnxModel[];
  isModelsLoading: boolean;
  defaultModel?: OnnxModel;
  modelId?: string;
  model?: OnnxModel;
  isAccessAllowed: boolean;
  // null = explicit cancel; undefined = use default.
  selectedModelId: string | null | undefined;
  selectModel: (id: string) => void;
  setSelectedModelId: (id: string | null | undefined) => void;
}

export function useSelectedOnnxModel({
  type,
  settingsKey,
  setModel,
  defaultPredicate,
}: Options): SelectedOnnxModel {
  const user = useAppStore(state => state.auth?.user);
  const isAuthLoading = useAppStore(state => state.isAuthLoading);
  const persistedModelId = useAppStore(state => state.appSettings[settingsKey]);
  const saveAppSettings = useAppStore(state => state.saveAppSettings);

  const {notification} = App.useApp();
  const {t} = useLingui();

  const {models, isLoading: isModelsLoading, isError: isModelsError} = useOnnxModels(type);

  const [selectedModelId, setSelectedModelId] = useState<string | null>();

  const sortedModels = useMemo<OnnxModel[]>(
    () =>
      [...(models?.values() ?? [])].sort(compareOnnxModelsByPriority({prioritizeFreeTier: !user})),
    [models, user]
  );

  const defaultModel = useMemo<OnnxModel | undefined>(() => {
    if (isAuthLoading || !models?.size) {
      return undefined;
    }
    const persisted = persistedModelId ? models.get(persistedModelId) : undefined;
    return persisted ?? getDefaultModel(models, user, defaultPredicate);
  }, [persistedModelId, models, user, isAuthLoading, defaultPredicate]);

  const modelId = selectedModelId === null ? undefined : (selectedModelId ?? defaultModel?.id);
  const model: OnnxModel | undefined = modelId ? models?.get(modelId) : undefined;
  const isAccessAllowed: boolean = !model || (!isAuthLoading && hasAccessTo(user, model));

  useEffect(() => {
    if (isModelsError) {
      notification.error({
        title: t`Error while fetching ML model data`,
        placement: 'top',
        duration: 10,
        showProgress: true,
      });
    }
  }, [isModelsError, notification, t]);

  useEffect(() => {
    if (isAuthLoading || !models?.size) {
      return;
    }
    setModel(modelId ? models.get(modelId) : undefined);
  }, [modelId, models, setModel, isAuthLoading]);

  const selectModel = useCallback(
    (id: string) => {
      setSelectedModelId(id);
      void saveAppSettings({[settingsKey]: id});
    },
    [saveAppSettings, settingsKey]
  );

  return {
    models,
    sortedModels,
    isModelsLoading,
    defaultModel,
    modelId,
    model,
    isAccessAllowed,
    selectedModelId,
    selectModel,
    setSelectedModelId,
  };
}
