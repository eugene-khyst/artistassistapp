/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {DatabaseOutlined, DeleteOutlined, EllipsisOutlined} from '@ant-design/icons';
import {Button, Col, Dropdown, Form, MenuProps, Popconfirm, Row, Select, Space} from 'antd';
import {useState} from 'react';
import {
  PaintMix,
  PaintType,
  comparePaintMixesByDataIndex,
  comparePaintMixesByName,
} from '../services/color';
import {RgbTuple} from '../services/color/model';
import {PalettePaintMixCard} from './color/PalettePaintMixCard';

enum Sort {
  ByDataIndex = 1,
  ByName = 2,
}

const PAINT_MIXES_COMPARATORS = {
  [Sort.ByDataIndex]: comparePaintMixesByDataIndex,
  [Sort.ByName]: comparePaintMixesByName,
};

type Props = {
  paintType: PaintType;
  paintMixes?: PaintMix[];
  savePaintMix: (paintMix: PaintMix) => void;
  deletePaintMix: (paintMixId: string) => void;
  deleteAllPaintMixes: (paintType: PaintType) => void;
  showShareModal: (paintMix: PaintMix) => void;
  setAsBackground: (background: string | RgbTuple) => void;
  showColorSwatch: (paintMixes: PaintMix[]) => void;
  showReflectanceChart: (paintMix: PaintMix) => void;
};

export const PaletteGrid: React.FC<Props> = ({
  paintType,
  paintMixes,
  savePaintMix,
  deletePaintMix,
  deleteAllPaintMixes,
  showShareModal,
  setAsBackground,
  showColorSwatch,
  showReflectanceChart,
}: Props) => {
  const [sort, setSort] = useState<Sort>(Sort.ByDataIndex);

  const items: MenuProps['items'] = [
    {
      key: '1',
      label: 'Color swatch',
      icon: <DatabaseOutlined />,
      onClick: () =>
        paintMixes && showColorSwatch(paintMixes.slice().sort(PAINT_MIXES_COMPARATORS[sort])),
      disabled: !paintMixes,
    },
  ];

  const handleDelteAllButtonClick = () => {
    deleteAllPaintMixes(paintType);
  };

  return !paintMixes ? null : (
    <>
      <Row>
        <Form.Item>
          <Form.Item
            label="Sort"
            style={{
              display: 'inline-block',
              marginBottom: 0,
              marginRight: 16,
            }}
          >
            <Select
              value={sort}
              onChange={(value: Sort) => setSort(value)}
              options={[
                {value: Sort.ByDataIndex, label: 'More recent'},
                {value: Sort.ByName, label: 'Alphabetically'},
              ]}
              style={{width: 130}}
            />
          </Form.Item>
          <Form.Item style={{display: 'inline-block', margin: 0}}>
            <Space.Compact block style={{display: 'flex', justifyContent: 'flex-end'}}>
              <Popconfirm
                title="Delete the paint mix"
                description="Are you sure to delete all paint mixes?"
                onConfirm={handleDelteAllButtonClick}
                okText="Yes"
                cancelText="No"
              >
                <Button icon={<DeleteOutlined />}>Delete all</Button>
              </Popconfirm>
              <Dropdown menu={{items}}>
                <Button icon={<EllipsisOutlined />} />
              </Dropdown>
            </Space.Compact>
          </Form.Item>
        </Form.Item>
      </Row>
      <Row gutter={[16, 16]} justify="start">
        {paintMixes
          .slice()
          .sort(PAINT_MIXES_COMPARATORS[sort])
          .map((paintMix: PaintMix) => (
            <Col key={paintMix.id} xs={24} md={12} lg={8}>
              <PalettePaintMixCard
                {...{
                  paintMix,
                  showShareModal,
                  setAsBackground,
                  showReflectanceChart,
                  savePaintMix,
                  deletePaintMix,
                }}
              />
            </Col>
          ))}
      </Row>
    </>
  );
};
