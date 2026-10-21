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
  UnorderedListOutlined,
} from '@ant-design/icons';
import {
  COLOR_MIXTURES_COMPARATORS,
  type ColorMixture,
  ColorMixtureSort,
  type ColorType,
  decorateSortUndecorate,
} from '@eugene-khyst/artistassistapp-color-mixer';
import {Trans, useLingui} from '@lingui/react/macro';
import {Button, Card, Col, Dropdown, Empty, Flex, Popconfirm, Row, Space, Typography} from 'antd';
import type {MenuProps} from 'antd/lib';
import {useEffect, useMemo, useRef, useState} from 'react';
import {useReactToPrint} from 'react-to-print';

import {AdCard} from '@/components/ad/AdCard';
import {ColorMixtureDescription} from '@/components/color/ColorMixtureDescription';
import {PaletteColorMixtureCard} from '@/components/color/PaletteColorMixtureCard';
import {COLOR_MIXTURE_SORT_LABELS} from '@/components/messages';
import {PaletteColorsDrawer} from '@/components/palette/PaletteColorsDrawer';
import {TonalValueFilter} from '@/components/tonal-value/TonalValueFilter';
import {TonalValueTag} from '@/components/tonal-value/TonalValueTag';
import {matchesTonalValue} from '@/services/color/tonal-value';
import {useAppStore} from '@/stores/app-store';

interface Props {
  colorType: ColorType;
  showColorSwatch: (colorMixture: ColorMixture[]) => void;
}

export function PaletteGrid({colorType, showColorSwatch}: Readonly<Props>) {
  const colorMixtures = useAppStore(state => state.paletteColorMixtures.get(colorType)!);
  const selectedTonalValue = useAppStore(state => state.selectedTonalValue);

  const deleteAllFromPalette = useAppStore(state => state.deleteAllFromPalette);
  const setSelectedTonalValue = useAppStore(state => state.setSelectedTonalValue);

  const {t} = useLingui();

  const [sort, setSort] = useState<ColorMixtureSort>(ColorMixtureSort.ByDate);
  const [isPrintContentVisible, setIsPrintContentVisible] = useState(false);
  const [isColorsDrawerOpen, setIsColorsDrawerOpen] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);
  const resolvePrintRef = useRef<(() => void) | null>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'ArtistAssistApp',
    onBeforePrint: () =>
      new Promise<void>(resolve => {
        resolvePrintRef.current = resolve;
        setIsPrintContentVisible(true);
      }),
    onAfterPrint: () => {
      resolvePrintRef.current = null;
      setIsPrintContentVisible(false);
    },
  });

  useEffect(() => {
    if (isPrintContentVisible && resolvePrintRef.current) {
      const resolvePrint = resolvePrintRef.current;
      resolvePrintRef.current = null;
      resolvePrint();
    }
  }, [isPrintContentVisible]);

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

  const sortedColorMixtures = useMemo(
    () =>
      decorateSortUndecorate(
        [...colorMixtures.values()].filter(({layerRgb}) =>
          matchesTonalValue(layerRgb, selectedTonalValue)
        ),
        COLOR_MIXTURES_COMPARATORS[sort]
      ),
    [colorMixtures, selectedTonalValue, sort]
  );

  return (
    <div className="u-tab-content">
      <Space align="center" wrap className="u-mb">
        <Button
          disabled={!sortedColorMixtures.length}
          icon={<DatabaseOutlined />}
          onClick={() => {
            showColorSwatch(sortedColorMixtures);
          }}
        >
          <Trans>Color swatch</Trans>
        </Button>
        <Button
          icon={<UnorderedListOutlined />}
          disabled={!sortedColorMixtures.length}
          onClick={() => {
            setIsColorsDrawerOpen(true);
          }}
        >
          <Trans>Colors needed</Trans>
        </Button>
        <Button
          icon={<PrinterOutlined />}
          disabled={isPrintContentVisible || !sortedColorMixtures.length}
          onClick={handlePrint}
        >
          <Trans>Print</Trans>
        </Button>
        <Popconfirm
          title={<Trans>Delete all color mixtures</Trans>}
          description={
            sortedColorMixtures.length < colorMixtures.size ? (
              <Trans>
                Delete all color mixtures in this palette, including those hidden by the filter?
              </Trans>
            ) : (
              <Trans>Delete all color mixtures in this palette?</Trans>
            )
          }
          onConfirm={() => void deleteAllFromPalette(colorType)}
          okText={<Trans>Delete all</Trans>}
          cancelText={<Trans>Keep</Trans>}
        >
          <Button icon={<DeleteOutlined />}>
            <Trans>Delete all</Trans>
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

        <TonalValueFilter />
      </Space>
      <Row gutter={[16, 16]} justify="start">
        {!sortedColorMixtures.length ? (
          <Col span={24}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={<Trans>No color mixtures match the filter</Trans>}
            >
              <Button
                onClick={() => {
                  setSelectedTonalValue(null);
                }}
              >
                <Trans>Show all</Trans>
              </Button>
            </Empty>
          </Col>
        ) : (
          sortedColorMixtures.map((colorMixture: ColorMixture) => (
            <Col key={colorMixture.key} xs={24} md={12} lg={8}>
              <PaletteColorMixtureCard colorMixture={colorMixture} />
            </Col>
          ))
        )}
        <Col xs={24} md={12} lg={8}>
          <AdCard vertical />
        </Col>
      </Row>
      {isPrintContentVisible && (
        <div className="u-print-only">
          <Row ref={printRef} gutter={[16, 16]} justify="start">
            {sortedColorMixtures.map((colorMixture: ColorMixture) => (
              <Col key={colorMixture.key} xs={24} sm={12} md={8}>
                <Card size="small">
                  <Space orientation="vertical" className="u-w-100">
                    <Flex align="center" justify="space-between" gap="small">
                      <Typography.Text strong ellipsis className="u-min-w-0">
                        {colorMixture.name || t`Untitled mixture`}
                      </Typography.Text>
                      <TonalValueTag rgb={colorMixture.layerRgb} interactive={false} />
                    </Flex>
                    <ColorMixtureDescription colorMixture={colorMixture} showTooltips={false} />
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      )}
      <PaletteColorsDrawer
        colorType={colorType}
        colorMixtures={sortedColorMixtures}
        open={isColorsDrawerOpen}
        onClose={() => {
          setIsColorsDrawerOpen(false);
        }}
      />
    </div>
  );
}
