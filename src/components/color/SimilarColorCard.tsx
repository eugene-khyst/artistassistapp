/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {BgColorsOutlined, EllipsisOutlined, QuestionCircleOutlined} from '@ant-design/icons';
import {Button, Card, Dropdown, MenuProps, Popover, Space, Typography, theme} from 'antd';
import {PaintMix, SimilarColor} from '~/src/services/color';
import {RgbTuple} from '~/src/services/color/model';
import {SaveToPaletteButton} from '~/src/components/button/SaveToPaletteButton';
import {PaintMixDescription} from './PaintMixDescription';

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
  setAsBackground: (background: string | RgbTuple) => void;
  paintMixes?: PaintMix[];
  savePaintMix: (paintMix: PaintMix) => void;
  deletePaintMix: (paintMixId: string) => void;
};

export const SimilarColorCard: React.FC<Props> = ({
  similarColor: {paintMix, deltaE},
  setAsBackground,
  paintMixes,
  savePaintMix,
  deletePaintMix,
}: Props) => {
  const {
    token: {colorTextTertiary},
  } = theme.useToken();

  const items: MenuProps['items'] = [
    {
      label: 'Set as background',
      key: '1',
      icon: <BgColorsOutlined />,
      onClick: () => setAsBackground(paintMix.paintMixLayerRgb),
    },
  ];

  return (
    <Card size="small">
      <Space direction="vertical" size="small" style={{width: '100%'}}>
        <PaintMixDescription
          paintMix={paintMix}
          extra={
            <Space size="small" align="center">
              <Typography.Text strong>{`ΔE*: ${deltaE.toFixed(1)}`}</Typography.Text>
              <Popover title="Color difference CIEDE2000" content={popoverContent}>
                <QuestionCircleOutlined style={{color: colorTextTertiary, cursor: 'help'}} />
              </Popover>
            </Space>
          }
        />
        <Space.Compact block style={{display: 'flex', justifyContent: 'flex-end'}}>
          <SaveToPaletteButton
            paintMix={paintMix}
            paintMixes={paintMixes}
            saveNewPaintMix={savePaintMix}
            deletePaintMix={deletePaintMix}
          />
          <Dropdown menu={{items}}>
            <Button icon={<EllipsisOutlined />} />
          </Dropdown>
        </Space.Compact>
      </Space>
    </Card>
  );
};
