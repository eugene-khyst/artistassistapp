/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {BgColorsOutlined, MoreOutlined, QuestionCircleOutlined} from '@ant-design/icons';
import type {MenuProps} from 'antd';
import {Button, Card, Dropdown, Popover, Space, theme, Typography} from 'antd';

import {SaveToPaletteButton} from '~/src/components/button/SaveToPaletteButton';
import type {SimilarColor} from '~/src/services/color';
import {useAppStore} from '~/src/stores/app-store';

import {ColorMixtureDescription} from './ColorMixtureDescription';

const popoverContent = (
  <ul>
    <li>&lt;=1 - Not perceptible by human eyes</li>
    <li>1-2 - Perceptible through close observation</li>
    <li>2-10 - Perceptible at a glance</li>
    <li>10-49 - Colors are more similar than opposite</li>
    <li>&gt;=100 - Colors are exact opposite</li>
  </ul>
);

type Props = {
  similarColor: SimilarColor;
};

export const SimilarColorCard: React.FC<Props> = ({
  similarColor: {colorMixture, deltaE},
}: Props) => {
  const setBackgroundColor = useAppStore(state => state.setBackgroundColor);

  const {
    token: {colorTextTertiary},
  } = theme.useToken();

  const items: MenuProps['items'] = [
    {
      label: 'Set as background',
      key: '1',
      icon: <BgColorsOutlined />,
      onClick: () => void setBackgroundColor(colorMixture.layerRgb),
    },
  ];

  return (
    <Card size="small">
      <Space direction="vertical" size="small" style={{width: '100%'}}>
        <ColorMixtureDescription colorMixture={colorMixture} />
        <Space size="small" style={{width: '100%', justifyContent: 'space-between'}}>
          <Space size="small" align="center">
            <Typography.Text strong>{`ΔE: ${deltaE.toFixed(1)}`}</Typography.Text>
            <Popover title="Color difference" content={popoverContent}>
              <QuestionCircleOutlined style={{color: colorTextTertiary, cursor: 'help'}} />
            </Popover>
          </Space>
          <Space.Compact block>
            <SaveToPaletteButton colorMixture={colorMixture} />
            <Dropdown menu={{items}}>
              <Button icon={<MoreOutlined />} />
            </Dropdown>
          </Space.Compact>
        </Space>
      </Space>
    </Card>
  );
};
