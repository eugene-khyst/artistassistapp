/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BgColorsOutlined,
  EllipsisOutlined,
  HeartTwoTone,
  LineChartOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import {Button, Card, Dropdown, MenuProps, Popover, Rate, Space, theme} from 'antd';
import {PaintMix, SimilarColor} from '../../services/color';
import {RgbTuple} from '../../services/color/model';
import {PaintMixDescription} from './PaintMixDescription';

function getRate(deltaE: number) {
  return deltaE <= 1 ? 3 : deltaE < 2 ? 2 : deltaE < 10 ? 1 : 0;
}

const popoverContent = (
  <ul>
    <li>&lt;=1 - Not perceptible by human eyes</li>
    <li>1-2 - Perceptible through close observation</li>
    <li>2-10 - Perceptible at a glance</li>
    <li>11-49 - Colors are more similar than opposite</li>
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
    token: {fontSize, colorTextSecondary, colorTextTertiary},
  } = theme.useToken();
  const rate = getRate(deltaE);
  const saveDisabled = paintMixes?.some((pm: PaintMix) => pm.id === paintMix.id);

  const handleSaveButtonClick = () => {
    savePaintMix({...paintMix, dataIndex: Date.now()});
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
    <Card
      size="small"
      headStyle={{width: '100%', fontSize: fontSize, fontWeight: 'normal'}}
      title={
        <Space size="small">
          <Rate value={rate} count={3} disabled />
          <span style={{color: colorTextSecondary}}>{`ΔE*: ${deltaE.toFixed(1)}`}</span>
          <Popover title="Color difference CIEDE2000" content={popoverContent}>
            <QuestionCircleOutlined style={{color: colorTextTertiary, cursor: 'help'}} />
          </Popover>
        </Space>
      }
      extra={
        <Space.Compact block style={{display: 'flex', justifyContent: 'flex-end'}}>
          <Button icon={<HeartTwoTone />} onClick={handleSaveButtonClick} disabled={saveDisabled}>
            Save
          </Button>
          <Dropdown menu={{items}}>
            <Button icon={<EllipsisOutlined />} />
          </Dropdown>
        </Space.Compact>
      }
    >
      <PaintMixDescription paintMix={paintMix} />
    </Card>
  );
};
