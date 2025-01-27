/**
 * ArtistAssistApp
 * Copyright (C) 2023-2025  Eugene Khyst
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import {DatabaseOutlined, DeleteOutlined, PrinterOutlined} from '@ant-design/icons';
import {Button, Card, Col, Form, Popconfirm, Row, Select, Space, Typography} from 'antd';
import type {DefaultOptionType as SelectOptionType} from 'antd/es/select';
import {useRef, useState} from 'react';
import {useReactToPrint} from 'react-to-print';

import {AdCard} from '~/src/components/ad/AdCard';
import {ColorMixtureDescription} from '~/src/components/color/ColorMixtureDescription';
import {PaletteColorMixtureCard} from '~/src/components/color/PaletteColorMixtureCard';
import {
  compareColorMixturesByDate,
  compareColorMixturesByName,
} from '~/src/services/color/color-mixer';
import type {ColorMixture, ColorType} from '~/src/services/color/types';
import {useAppStore} from '~/src/stores/app-store';
import {reverseOrder} from '~/src/utils/array';

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

interface Props {
  colorType: ColorType;
  colorMixtures?: ColorMixture[];
  showColorSwatch: (colorMixture: ColorMixture[]) => void;
}

export const PaletteGrid: React.FC<Props> = ({
  colorType,
  colorMixtures,
  showColorSwatch,
}: Props) => {
  const deleteAllFromPalette = useAppStore(state => state.deleteAllFromPalette);

  const [sort, setSort] = useState<Sort>(Sort.ByDataIndex);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'ArtistAssistApp',
  });

  const sortedColorMixtures = colorMixtures?.slice().sort(COLOR_MIXTURES_COMPARATORS[sort]);

  return !sortedColorMixtures ? null : (
    <>
      <Space align="center" wrap style={{marginBottom: 16}}>
        <Button
          type="primary"
          icon={<DatabaseOutlined />}
          onClick={() => {
            showColorSwatch(sortedColorMixtures);
          }}
        >
          Color swatch
        </Button>
        <Button
          icon={<PrinterOutlined />}
          onClick={() => {
            handlePrint();
          }}
        >
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
            onChange={(value: Sort) => {
              setSort(value);
            }}
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
        <Col xs={24} md={12} lg={8}>
          <AdCard vertical />
        </Col>
      </Row>
      <div style={{display: 'none'}}>
        <Row ref={printRef} gutter={[16, 16]} justify="start">
          {sortedColorMixtures.map((colorMixture: ColorMixture) => (
            <Col key={colorMixture.key} xs={24} md={12} lg={8}>
              <Card size="small">
                <Space direction="vertical">
                  <Typography.Text style={{fontWeight: 'bold'}}>
                    {colorMixture.name || 'Untitled mixture'}
                  </Typography.Text>
                  <ColorMixtureDescription colorMixture={colorMixture} showTooltips={false} />
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    </>
  );
};
