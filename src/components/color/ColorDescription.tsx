/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Space, Tooltip, Typography} from 'antd';

import {OpacityIcon} from '~/src/components/color/OpacityIcon';
import {useColorBrands} from '~/src/hooks';
import type {Color, ColorBrandDefinition, ColorType} from '~/src/services/color';
import {formatColorLabel} from '~/src/services/color';

import {ColorSquare} from './ColorSquare';

type Props = {
  colorType: ColorType;
  color: Color;
  text?: string | number;
};

export const ColorDescription: React.FC<Props> = ({colorType, color, text}: Props) => {
  const {brands} = useColorBrands(colorType);

  const {brand: brandId, rgb, opacity} = color;
  const brand: ColorBrandDefinition | undefined = brands?.get(brandId);

  if (!brand) {
    return <ColorSquare color="fff" size="large" />;
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
          <OpacityIcon opacity={opacity} />
        </Space>
      </span>
    </Space>
  );
};
