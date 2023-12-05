/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BgColorsOutlined,
  DeleteOutlined,
  EllipsisOutlined,
  LineChartOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import {Button, Card, Dropdown, MenuProps, Popconfirm, Space, Typography} from 'antd';
import {PaintMix} from '../../services/color';
import {RgbTuple} from '../../services/color/model';
import {PaintMixDescription} from '../color/PaintMixDescription';

type Props = {
  paintMix: PaintMix;
  savePaintMix: (paintMix: PaintMix) => void;
  deletePaintMix: (paintMixId: string) => void;
  showShareModal: (paintMix: PaintMix) => void;
  setAsBackground: (background: string | RgbTuple) => void;
  showReflectanceChart: (paintMix: PaintMix) => void;
};

export const PalettePaintMixCard: React.FC<Props> = ({
  paintMix,
  savePaintMix,
  deletePaintMix,
  showShareModal,
  setAsBackground,
  showReflectanceChart,
}: Props) => {
  const items: MenuProps['items'] = [
    {
      key: '1',
      label: 'Share',
      icon: <ShareAltOutlined />,
      onClick: () => showShareModal(paintMix),
    },
    {
      key: '2',
      label: 'Set as background',
      icon: <BgColorsOutlined />,
      onClick: () => setAsBackground(paintMix.paintMixLayerRgb),
    },
    {
      key: '3',
      label: 'Reflectance chart',
      icon: <LineChartOutlined />,
      onClick: () => showReflectanceChart(paintMix),
    },
  ];

  const handleTitleEdited = (value: string) => {
    const editedPaintMix: PaintMix = {...paintMix, name: value};
    savePaintMix(editedPaintMix);
  };

  const handleDeleteButtonClick = () => {
    deletePaintMix(paintMix.id);
  };

  return (
    <Card
      title={
        <Typography.Text
          ellipsis={{tooltip: true}}
          editable={{
            text: paintMix.name ?? '',
            onChange: handleTitleEdited,
            autoSize: false,
          }}
          style={{width: 'calc(100% - 16px)'}}
        >
          {paintMix.name || 'Paint mix'}
        </Typography.Text>
      }
      extra={
        <Space.Compact block style={{display: 'flex', justifyContent: 'flex-end'}}>
          <Popconfirm
            title="Delete the paint mix"
            description="Are you sure to delete this paint mix?"
            onConfirm={handleDeleteButtonClick}
            okText="Yes"
            cancelText="No"
          >
            <Button icon={<DeleteOutlined />}>Delete</Button>
          </Popconfirm>
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
