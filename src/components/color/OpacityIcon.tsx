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

import {ColorOpacity} from '~/src/services/color/types';

interface OpacityDescription {
  icon: ReactNode;
  tooltip: MessageDescriptor;
}

const OPACITIES: Record<ColorOpacity, OpacityDescription> = {
  [ColorOpacity.Transparent]: {
    icon: (
      <svg
        width="1em"
        height="1em"
        fill="currentColor"
        aria-hidden="true"
        data-icon="transparent-rect"
        focusable="false"
        version="1.1"
        viewBox="64 64 896 896"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="m64 64v896h896v-896h-896zm76 76h744v744h-744v-744z" />
      </svg>
    ),
    tooltip: defineMessage`Transparent`,
  },
  [ColorOpacity.SemiTransparent]: {
    icon: (
      <svg
        width="1em"
        height="1em"
        fill="currentColor"
        aria-hidden="true"
        data-icon="semi-transparent-rect"
        focusable="false"
        version="1.1"
        viewBox="64 64 896 896"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="m64 64v896h896v-896h-896zm76 76h690.26l-690.26 690.26v-690.26zm744 53.738v690.26h-690.26l690.26-690.26z" />
      </svg>
    ),
    tooltip: defineMessage`Semi-transparent`,
  },
  [ColorOpacity.SemiOpaque]: {
    icon: (
      <svg
        width="1em"
        height="1em"
        fill="currentColor"
        aria-hidden="true"
        data-icon="semi-opaque-rect"
        focusable="false"
        version="1.1"
        viewBox="64 64 896 896"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="m64 64v896h896v-896zm820 129.74v690.26h-690.26z" />
      </svg>
    ),
    tooltip: defineMessage`Semi-opaque`,
  },
  [ColorOpacity.Opaque]: {
    icon: (
      <svg
        width="1em"
        height="1em"
        fill="currentColor"
        aria-hidden="true"
        data-icon="opaque-rect"
        focusable="false"
        version="1.1"
        viewBox="64 64 896 896"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="m64 64v896h896v-896z" />
      </svg>
    ),
    tooltip: defineMessage`Opaque`,
  },
};

interface Props {
  opacity?: ColorOpacity;
}

export const OpacityIcon: React.FC<Props> = ({opacity}: Props) => {
  const {t} = useLingui();
  if (!opacity) {
    return <></>;
  }
  const {tooltip, icon} = OPACITIES[opacity];
  return <Tooltip title={t(tooltip)}>{icon}</Tooltip>;
};
