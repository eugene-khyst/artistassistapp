/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {DeleteTwoTone} from '@ant-design/icons';
import {Button, Col, Form, Popconfirm, Row, Select} from 'antd';
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
  setAsBackground: (background: string | RgbTuple) => void;
  showReflectanceChart: (paintMix: PaintMix) => void;
};

export const PaletteGrid: React.FC<Props> = ({
  paintType,
  paintMixes,
  savePaintMix,
  deletePaintMix,
  deleteAllPaintMixes,
  setAsBackground,
  showReflectanceChart,
}: Props) => {
  const [sort, setSort] = useState<Sort>(Sort.ByDataIndex);

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
            <Popconfirm
              title="Delete the paint mix"
              description="Are you sure to delete all paint mixes?"
              onConfirm={handleDelteAllButtonClick}
              okText="Yes"
              cancelText="No"
            >
              <Button icon={<DeleteTwoTone />}>Delete all</Button>
            </Popconfirm>
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
                {...{paintMix, setAsBackground, showReflectanceChart, savePaintMix, deletePaintMix}}
              />
            </Col>
          ))}
      </Row>
    </>
  );
};
