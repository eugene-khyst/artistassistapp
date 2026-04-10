/**
 * ArtistAssistApp
 * Copyright (C) 2023-2026  Eugene Khyst
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

import {
  DatabaseOutlined,
  DeleteOutlined,
  PrinterOutlined,
  SortAscendingOutlined,
} from '@ant-design/icons';
import {Trans, useLingui} from '@lingui/react/macro';
import {Button, Card, Col, Dropdown, Popconfirm, Row, Space, Typography} from 'antd';
import type {MenuProps} from 'antd/lib';
import {useEffect, useRef, useState} from 'react';
import {useReactToPrint} from 'react-to-print';

import {AdCard} from '~/src/components/ad/AdCard';
import {ColorMixtureDescription} from '~/src/components/color/ColorMixtureDescription';
import {PaletteColorMixtureCard} from '~/src/components/color/PaletteColorMixtureCard';
import {COLOR_MIXTURE_SORT_LABELS} from '~/src/components/messages';
import {COLOR_MIXTURES_COMPARATORS, ColorMixtureSort} from '~/src/services/color/color-mixer';
import type {ColorMixture, ColorType} from '~/src/services/color/types';
import {useAppStore} from '~/src/stores/app-store';
import {decorateSortUndecorate} from '~/src/utils/array';

interface Props {
  colorType: ColorType;
  showColorSwatch: (colorMixture: ColorMixture[]) => void;
}

export const PaletteGrid: React.FC<Props> = ({colorType, showColorSwatch}: Props) => {
  const colorMixtures = useAppStore(state => state.paletteColorMixtures.get(colorType));

  const deleteAllFromPalette = useAppStore(state => state.deleteAllFromPalette);

  const {t} = useLingui();

  const [sort, setSort] = useState<ColorMixtureSort>(ColorMixtureSort.ByDate);
  const [isPrintContentVisible, setIsPrintContentVisible] = useState<boolean>(false);

  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'ArtistAssistApp',
    onAfterPrint: () => {
      setIsPrintContentVisible(false);
    },
  });

  useEffect(() => {
    if (isPrintContentVisible) {
      handlePrint();
    }
  }, [isPrintContentVisible, handlePrint]);

  const sortItems: MenuProps['items'] = [
    ColorMixtureSort.ByDate,
    ColorMixtureSort.ByName,
    ColorMixtureSort.ByHue,
    ColorMixtureSort.ByLightness,
  ].map(value => ({
    key: String(value),
    label: t(COLOR_MIXTURE_SORT_LABELS[value]),
    onClick: () => {
      setSort(value);
    },
  }));

  const sortedColorMixtures = decorateSortUndecorate(
    [...(colorMixtures?.values() ?? [])],
    COLOR_MIXTURES_COMPARATORS[sort]
  );

  return sortedColorMixtures ? (
    <>
      <Space align="center" wrap style={{marginBottom: 16}}>
        <Button
          type="primary"
          icon={<DatabaseOutlined />}
          onClick={() => {
            showColorSwatch(sortedColorMixtures);
          }}
        >
          <Trans>Color swatch</Trans>
        </Button>
        <Button
          icon={<PrinterOutlined />}
          onClick={() => {
            setIsPrintContentVisible(true);
          }}
        >
          <Trans>Print</Trans>
        </Button>
        <Popconfirm
          title={t`Remove all color mixtures`}
          description={t`Are you sure you want to remove all color mixtures?`}
          onConfirm={() => void deleteAllFromPalette(colorType)}
          okText={t`Yes`}
          cancelText={t`No`}
        >
          <Button icon={<DeleteOutlined />}>
            <Trans>Remove all</Trans>
          </Button>
        </Popconfirm>

        <Dropdown
          trigger={['click']}
          menu={{
            items: sortItems,
            selectedKeys: [String(sort)],
          }}
        >
          <Button icon={<SortAscendingOutlined />}>
            <Trans>Sort</Trans>
          </Button>
        </Dropdown>
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
      {isPrintContentVisible && (
        <div className="print-only">
          <Row ref={printRef} gutter={[16, 16]} justify="start">
            {sortedColorMixtures.map((colorMixture: ColorMixture) => (
              <Col key={colorMixture.key} xs={24} sm={12} md={8}>
                <Card size="small">
                  <Space orientation="vertical">
                    <Typography.Text style={{fontWeight: 'bold'}}>
                      {colorMixture.name || t`Untitled mixture`}
                    </Typography.Text>
                    <ColorMixtureDescription colorMixture={colorMixture} showTooltips={false} />
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      )}
    </>
  ) : null;
};
