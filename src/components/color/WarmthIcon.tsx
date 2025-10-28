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

import type {MessageDescriptor} from '@lingui/core';
import {defineMessage} from '@lingui/core/macro';
import {useLingui} from '@lingui/react/macro';
import {Tooltip} from 'antd';
import type {ReactNode} from 'react';

import Cool from '~/src/icons/warmth/cool.svg?react';
import Neutral from '~/src/icons/warmth/neutral.svg?react';
import Warm from '~/src/icons/warmth/warm.svg?react';
import {ColorWarmth} from '~/src/services/color/types';

interface WarmthDescription {
  icon: ReactNode;
  tooltip: MessageDescriptor;
}

const WARMTH: Record<ColorWarmth, WarmthDescription> = {
  [ColorWarmth.Warm]: {
    icon: <Warm className="warmth-icon" />,
    tooltip: defineMessage`Warm — Algorithmic estimate; artistic perception may vary.`,
  },
  [ColorWarmth.Cool]: {
    icon: <Cool className="warmth-icon" />,
    tooltip: defineMessage`Cool — Algorithmic estimate; artistic perception may vary.`,
  },
  [ColorWarmth.Neutral]: {
    icon: <Neutral className="warmth-icon" />,
    tooltip: defineMessage`Neutral — Algorithmic estimate; artistic perception may vary.`,
  },
};

interface Props {
  warmth?: ColorWarmth;
}

export const WarmthIcon: React.FC<Props> = ({warmth}: Props) => {
  const {t} = useLingui();
  if (!warmth) {
    return <></>;
  }
  const {tooltip, icon} = WARMTH[warmth];
  return <Tooltip title={t(tooltip)}>{icon}</Tooltip>;
};
