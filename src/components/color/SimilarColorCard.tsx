/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BgColorsOutlined,
  EllipsisOutlined,
  LineChartOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import {Button, Card, Dropdown, MenuProps, Popover, Space, Typography, theme} from 'antd';
import {PaintMix, SimilarColor} from '../../services/color';
import {RgbTuple} from '../../services/color/model';
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
  showReflectanceChart: (paintMix: PaintMix) => void;
  paintMixes?: PaintMix[];
  savePaintMix: (paintMix: PaintMix) => void;
};

export const SimilarColorCard: React.FC<Props> = ({
  similarColor: {paintMix, deltaE},
  setAsBackground,
  showReflectanceChart,
  paintMixes,
  savePaintMix,
}: Props) => {
  const {
    token: {colorTextTertiary},
  } = theme.useToken();

  const saveDisabled = paintMixes?.some((pm: PaintMix) => pm.id === paintMix.id);

  const handleSaveButtonClick = () => {
    savePaintMix(paintMix);
  };

  const items: MenuProps['items'] = [
    {
      label: 'Set as background',
      key: '1',
      icon: <BgColorsOutlined />,
      onClick: () => setAsBackground(paintMix.paintMixLayerRgb),
    },
    {
      label: 'Reflectance chart',
      key: '2',
      icon: <LineChartOutlined />,
      onClick: () => showReflectanceChart(paintMix),
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
          <Button icon={<PlusOutlined />} onClick={handleSaveButtonClick} disabled={saveDisabled}>
            Add to palette
          </Button>
          <Dropdown menu={{items}}>
            <Button icon={<EllipsisOutlined />} />
          </Dropdown>
        </Space.Compact>
      </Space>
    </Card>
  );
};
