/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {DatabaseOutlined, DeleteOutlined, PrinterOutlined} from '@ant-design/icons';
import {Button, Col, Flex, Form, Popconfirm, Row, Select, Space, Typography} from 'antd';
import type {DefaultOptionType as SelectOptionType} from 'antd/es/select';
import {useRef, useState} from 'react';
import {useReactToPrint} from 'react-to-print';

import {ColorMixtureDescription} from '~/src/components/color/ColorMixtureDescription';
import {PaletteColorMixtureCard} from '~/src/components/color/PaletteColorMixtureCard';
import type {ColorMixture, ColorType} from '~/src/services/color';
import {compareColorMixturesByDate, compareColorMixturesByName} from '~/src/services/color';
import {useAppStore} from '~/src/stores/app-store';
import {reverseOrder} from '~/src/utils';

enum Sort {
  ByDataIndex = 1,
  ByName = 2,
}

const COLOR_MIXTURES_COMPARATORS = {
  [Sort.ByDataIndex]: reverseOrder(compareColorMixturesByDate),
  [Sort.ByName]: compareColorMixturesByName,
};

const SORT_OPTIONS: SelectOptionType[] = [
  {value: Sort.ByDataIndex, label: 'Chronologically'},
  {value: Sort.ByName, label: 'Alphabetically'},
];

type Props = {
  colorType: ColorType;
  colorMixtures?: ColorMixture[];
  showColorSwatch: (colorMixture: ColorMixture[]) => void;
};

export const PaletteGrid: React.FC<Props> = ({
  colorType,
  colorMixtures,
  showColorSwatch,
}: Props) => {
  const deleteAllFromPalette = useAppStore(state => state.deleteAllFromPalette);

  const [sort, setSort] = useState<Sort>(Sort.ByDataIndex);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
  });

  const sortedColorMixtures = colorMixtures?.slice().sort(COLOR_MIXTURES_COMPARATORS[sort]);

  return !sortedColorMixtures ? null : (
    <>
      <Space align="start" wrap style={{marginBottom: 16}}>
        <Button
          type="primary"
          icon={<DatabaseOutlined />}
          onClick={() => showColorSwatch(sortedColorMixtures)}
        >
          Color swatch
        </Button>
        <Button icon={<PrinterOutlined />} onClick={handlePrint}>
          Print
        </Button>
        <Popconfirm
          title="Remove all color mixtures"
          description="Are you sure you want to remove all color mixtures?"
          onConfirm={() => void deleteAllFromPalette(colorType)}
          okText="Yes"
          cancelText="No"
        >
          <Button icon={<DeleteOutlined />}>Remove all</Button>
        </Popconfirm>
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
        {sortedColorMixtures.map((colorMixture: ColorMixture) => (
          <Col key={colorMixture.key} xs={24} md={12} lg={8}>
            <PaletteColorMixtureCard colorMixture={colorMixture} />
          </Col>
        ))}
      </Row>
      <div style={{display: 'none'}}>
        <Flex ref={printRef} wrap="wrap" gap={32} justify="space-between">
          {sortedColorMixtures.map((colorMixture: ColorMixture) => (
            <span key={colorMixture.key} style={{breakBefore: 'auto'}}>
              <Space direction="vertical" size="small">
                <Typography.Text style={{fontWeight: 'bold'}}>
                  {colorMixture.name || 'Color mixture'}
                </Typography.Text>
                <ColorMixtureDescription colorMixture={colorMixture} showTooltips={false} />
              </Space>
            </span>
          ))}
        </Flex>
      </div>
    </>
  );
};
