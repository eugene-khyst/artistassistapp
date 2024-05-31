/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Tooltip} from 'antd';
import type {ReactNode} from 'react';

import {ColorOpacity} from '~/src/services/color';

type OpacityDescription = {
  icon: ReactNode;
  tooltip: string;
};

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
    tooltip: 'Transparent',
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
    tooltip: 'Semi-transparent',
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
    tooltip: 'Semi-opaque',
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
    tooltip: 'Opaque',
  },
};

type Props = {
  opacity: ColorOpacity;
};

export const OpacityIcon: React.FC<Props> = ({opacity}: Props) => {
  const {tooltip, icon} = OPACITIES[opacity];
  return <Tooltip title={tooltip}>{icon}</Tooltip>;
};
