/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BgColorsOutlined,
  EllipsisOutlined,
  MinusOutlined,
  PictureOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import {Button, Card, Dropdown, MenuProps, Popconfirm, Space, Typography} from 'antd';
import {PaintMix, Pipet} from '~/src/services/color';
import {RgbTuple} from '~/src/services/color/model';
import {PaintMixDescription} from '~/src/components/color/PaintMixDescription';

type Props = {
  paintMix: PaintMix;
  savePaintMix: (paintMix: PaintMix, isNew?: boolean) => void;
  deletePaintMix: (paintMixId: string) => void;
  showShareModal: (paintMix: PaintMix) => void;
  setColorPicker: (pipet?: Pipet) => void;
  setAsBackground: (background: string | RgbTuple) => void;
};

export const PalettePaintMixCard: React.FC<Props> = ({
  paintMix,
  savePaintMix,
  deletePaintMix,
  showShareModal,
  setColorPicker,
  setAsBackground,
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
  ];

  const handleTitleEdited = (value: string) => {
    const editedPaintMix: PaintMix = {...paintMix, name: value};
    savePaintMix(editedPaintMix);
  };

  const handleShowOnPhotoClick = () => {
    const {pipet} = paintMix;
    if (pipet) {
      setColorPicker(pipet);
    }
  };

  const handleDeleteButtonClick = () => {
    deletePaintMix(paintMix.id);
  };

  return (
    <Card size="small" bordered={false}>
      <Space direction="vertical" size="small" style={{width: '100%'}}>
        <Typography.Text
          ellipsis={{tooltip: true}}
          editable={{
            text: paintMix.name ?? '',
            onChange: handleTitleEdited,
            autoSize: false,
          }}
          style={{width: '100%', fontWeight: 'bold'}}
        >
          {paintMix.name || 'Color mixture name'}
        </Typography.Text>

        <PaintMixDescription paintMix={paintMix} />

        <Space.Compact block style={{display: 'flex', justifyContent: 'flex-end'}}>
          <Button
            icon={<PictureOutlined />}
            onClick={handleShowOnPhotoClick}
            disabled={!paintMix.pipet}
          >
            Show on photo
          </Button>
          <Popconfirm
            title="Remove the color mixture"
            description="Are you sure you want to remove this color mixture?"
            onConfirm={handleDeleteButtonClick}
            okText="Yes"
            cancelText="No"
          >
            <Button icon={<MinusOutlined />}>Remove</Button>
          </Popconfirm>
          <Dropdown menu={{items}}>
            <Button icon={<EllipsisOutlined />} />
          </Dropdown>
        </Space.Compact>
      </Space>
    </Card>
  );
};
