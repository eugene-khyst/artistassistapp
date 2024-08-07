/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Space, Tooltip, Typography} from 'antd';

import {OpacityIcon} from '~/src/components/color/OpacityIcon';
import type {Color, ColorBrandDefinition} from '~/src/services/color';
import {formatColorLabel} from '~/src/services/color';
import {useAppStore} from '~/src/stores/app-store';

import {ColorSquare} from './ColorSquare';

type Props = {
  color: Color;
  text?: string | number;
};

export const ColorDescription: React.FC<Props> = ({color, text}: Props) => {
  const colorSet = useAppStore(state => state.colorSet);

  const {brand: brandId, rgb} = color;
  const brand: ColorBrandDefinition | undefined = colorSet?.brands.get(brandId);

  if (!brand) {
    return <></>;
  }

  const {shortName, fullName} = brand;
  return (
    <Space size="small">
      <ColorSquare color={rgb} size="large" text={text} />
      <span>
        <Tooltip title={fullName}>
          <Typography.Text>{shortName || fullName}</Typography.Text>
        </Tooltip>
        <br />
        <Space size="small" align="center">
          <Typography.Text strong>{formatColorLabel(color, brand)}</Typography.Text>
          <OpacityIcon opacity={color.opacity} />
        </Space>
      </span>
    </Space>
  );
};
