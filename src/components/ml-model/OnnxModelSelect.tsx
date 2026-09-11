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

import {Trans} from '@lingui/react/macro';
import type {FlattenOptionData} from '@rc-component/select/es/interface';
import {Flex, Select, type SelectProps, Typography} from 'antd';
import type {DefaultOptionType} from 'antd/es/select';
import {type ReactNode, useMemo} from 'react';

import type {User} from '@/services/auth/types';
import {hasAccessTo} from '@/services/auth/utils';
import {compareByPriority} from '@/services/catalog';
import {type OnnxModel, SOBEL_EDGE_DETECTION_MODEL_ID} from '@/services/ml/types';
import {useAppStore} from '@/stores/app-store';

const MAX_SCORE = 5;

function formatScore(score: number): string {
  return '★'.repeat(score) + '☆'.repeat(MAX_SCORE - score);
}

type Feature = 'detail' | 'speed' | 'subject-detection' | 'fine-detail' | 'color-realism';

const FEATURES: Record<Feature, ReactNode> = {
  detail: <Trans>Detail</Trans>,
  speed: <Trans>Speed</Trans>,
  'subject-detection': <Trans>Subject detection</Trans>,
  'fine-detail': <Trans>Fine detail</Trans>,
  'color-realism': <Trans>Color realism</Trans>,
};

type Scores = Partial<Record<Feature, number>>;

const OPTIONS: Record<
  string,
  {
    label: ReactNode;
    description?: ReactNode;
    scores?: Scores;
  }
> = {
  'informative-drawings': {
    label: <Trans>Finest</Trans>,
    scores: {
      detail: 5,
      speed: 3,
    },
  },
  teed: {
    label: <Trans>Sharp</Trans>,
    scores: {
      detail: 4,
      speed: 4,
    },
  },
  dexined: {
    label: <Trans>Thick</Trans>,
    scores: {
      detail: 4,
      speed: 1,
    },
  },
  [SOBEL_EDGE_DETECTION_MODEL_ID]: {
    label: <Trans>Instant</Trans>,
    scores: {
      detail: 3,
      speed: 5,
    },
  },
  'birefnet-general-lite': {
    label: <Trans>Finest</Trans>,
    scores: {
      'subject-detection': 5,
      'fine-detail': 5,
      speed: 1,
    },
  },
  u2net: {
    label: <Trans>Accurate</Trans>,
    scores: {
      'subject-detection': 4,
      'fine-detail': 4,
      speed: 2,
    },
  },
  silueta: {
    label: <Trans>Fast</Trans>,
    scores: {
      'subject-detection': 3,
      'fine-detail': 3,
      speed: 4,
    },
  },
  u2netp: {
    label: <Trans>Fastest</Trans>,
    scores: {
      'subject-detection': 3,
      'fine-detail': 2,
      speed: 5,
    },
  },
  'ddcolor-artistic-int8': {
    label: <Trans>Finest</Trans>,
    scores: {
      'color-realism': 5,
      speed: 1,
    },
  },
  'ddcolor-tiny-int8': {
    label: <Trans>Light</Trans>,
    scores: {
      'color-realism': 3,
      speed: 3,
    },
  },
  'nafnet-sidd-width32': {
    label: <Trans>Denoise</Trans>,
    description: <Trans>Removes noise and grain</Trans>,
  },
  'nafnet-gopro-width64': {
    label: <Trans>Deblur</Trans>,
    description: <Trans>Removes motion blur</Trans>,
  },
  'nafnet-reds-width64': {
    label: <Trans>Deblur JPEG</Trans>,
    description: <Trans>Removes blur and JPEG artifacts</Trans>,
  },
};

interface SelectOptionType extends DefaultOptionType {
  description?: ReactNode;
  scores?: Partial<Record<Feature, number>>;
}

function getOnnxModelOptions(
  user?: User | null,
  models?: Map<string, OnnxModel>
): SelectOptionType[] {
  if (!models?.size) {
    return [];
  }
  return [...models.values()].sort(compareByPriority).map(model => {
    const {id} = model;
    const {label, description, scores} = OPTIONS[id] ?? {label: id};
    return {
      value: id,
      label,
      description,
      scores,
      disabled: !hasAccessTo(user, model),
    };
  });
}

function SelectOption({
  label,
  description,
  scores,
}: Readonly<Pick<SelectOptionType, 'label' | 'description' | 'scores'>>) {
  return (
    <Flex vertical>
      {label}
      {description && <Typography.Text type="secondary">{description}</Typography.Text>}
      {scores && (
        <ul className="u-list-unstyled u-m-0">
          {Object.entries(scores).map(([feature, score]) => (
            <li key={feature}>
              <Typography.Text type="secondary">
                {FEATURES[feature as Feature]} {formatScore(score)}
              </Typography.Text>
            </li>
          ))}
        </ul>
      )}
    </Flex>
  );
}

const renderOption = ({
  data: {label, description, scores},
}: FlattenOptionData<SelectOptionType>): ReactNode => (
  <SelectOption label={label} description={description} scores={scores} />
);

type Props = SelectProps & {
  models?: Map<string, OnnxModel>;
};

export function OnnxModelSelect({models, ...rest}: Readonly<Props>) {
  const user = useAppStore(state => state.auth?.user);

  const options = useMemo(() => getOnnxModelOptions(user, models), [user, models]);

  return (
    <Select<string, SelectOptionType>
      options={options}
      {...rest}
      optionRender={renderOption}
      popupMatchSelectWidth={false}
    />
  );
}
