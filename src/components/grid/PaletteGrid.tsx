/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {DatabaseOutlined, MinusOutlined, PrinterOutlined} from '@ant-design/icons';
import {Button, Col, Flex, Form, Popconfirm, Row, Select, Space, Typography} from 'antd';
import {DefaultOptionType as SelectOptionType} from 'antd/es/select';
import {useRef, useState} from 'react';
import {useReactToPrint} from 'react-to-print';
import {PaintMixDescription} from '~/src/components/color/PaintMixDescription';
import {PalettePaintMixCard} from '~/src/components/color/PalettePaintMixCard';
import {
  PaintMix,
  PaintType,
  Pipet,
  comparePaintMixesByDataIndex,
  comparePaintMixesByName,
} from '~/src/services/color';
import {RgbTuple} from '~/src/services/color/model';

enum Sort {
  ByDataIndex = 1,
  ByName = 2,
}

const PAINT_MIXES_COMPARATORS = {
  [Sort.ByDataIndex]: comparePaintMixesByDataIndex,
  [Sort.ByName]: comparePaintMixesByName,
};

const SORT_OPTIONS: SelectOptionType[] = [
  {value: Sort.ByDataIndex, label: 'Chronologically'},
  {value: Sort.ByName, label: 'Alphabetically'},
];

type Props = {
  paintType: PaintType;
  paintMixes?: PaintMix[];
  savePaintMix: (paintMix: PaintMix, isNew?: boolean) => void;
  deletePaintMix: (paintMixId: string) => void;
  deletePaintMixesByType: (paintType: PaintType) => void;
  showShareModal: (paintMix: PaintMix) => void;
  setColorPicker: (pipet?: Pipet) => void;
  setAsBackground: (background: string | RgbTuple) => void;
  showColorSwatch: (paintMixes: PaintMix[]) => void;
};

export const PaletteGrid: React.FC<Props> = ({
  paintType,
  paintMixes,
  savePaintMix,
  deletePaintMix,
  deletePaintMixesByType,
  showShareModal,
  setColorPicker,
  setAsBackground,
  showColorSwatch,
}: Props) => {
  const [sort, setSort] = useState<Sort>(Sort.ByDataIndex);
  const printRef = useRef<HTMLDivElement>(null);

  const handleDelteAllButtonClick = () => {
    deletePaintMixesByType(paintType);
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
  });

  const sortedPaintMixes = paintMixes?.slice().sort(PAINT_MIXES_COMPARATORS[sort]);

  return !sortedPaintMixes ? null : (
    <>
      <Space align="start" wrap style={{marginBottom: 16}}>
        <Button
          type="primary"
          icon={<DatabaseOutlined />}
          onClick={() => showColorSwatch(sortedPaintMixes)}
        >
          Color swatch
        </Button>
        <Space.Compact block style={{display: 'flex', justifyContent: 'flex-end'}}>
          <Button icon={<PrinterOutlined />} onClick={handlePrint}>
            Print
          </Button>
          <Popconfirm
            title="Remove all color mixtures"
            description="Are you sure you want to remove all color mixtures?"
            onConfirm={handleDelteAllButtonClick}
            okText="Yes"
            cancelText="No"
          >
            <Button icon={<MinusOutlined />}>Remove all</Button>
          </Popconfirm>
        </Space.Compact>
        <Form.Item label="Sort" style={{marginBottom: 0}}>
          <Select
            value={sort}
            onChange={(value: Sort) => setSort(value)}
            options={SORT_OPTIONS}
            style={{width: 150}}
          />
        </Form.Item>
      </Space>
      <Row gutter={[16, 16]} justify="start">
        {sortedPaintMixes.map((paintMix: PaintMix) => (
          <Col key={paintMix.id} xs={24} md={12} lg={8}>
            <PalettePaintMixCard
              paintMix={paintMix}
              showShareModal={showShareModal}
              setColorPicker={setColorPicker}
              setAsBackground={setAsBackground}
              savePaintMix={savePaintMix}
              deletePaintMix={deletePaintMix}
            />
          </Col>
        ))}
      </Row>
      <div style={{display: 'none'}}>
        <Flex ref={printRef} wrap="wrap" gap={32} justify="space-between">
          {sortedPaintMixes.map((paintMix: PaintMix) => (
            <span key={paintMix.id} style={{breakBefore: 'auto'}}>
              <Space direction="vertical" size="small">
                <Typography.Text style={{fontWeight: 'bold'}}>
                  {paintMix.name || 'Color mixture'}
                </Typography.Text>
                <PaintMixDescription paintMix={paintMix} showTooltips={false} />
              </Space>
            </span>
          ))}
        </Flex>
      </div>
    </>
  );
};
