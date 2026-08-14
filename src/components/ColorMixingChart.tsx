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
  DownloadOutlined,
  DownOutlined,
  PrinterOutlined,
  SortAscendingOutlined,
} from '@ant-design/icons';
import {
  type ColorId,
  ColorSort,
  isMixable,
  isTransparentLayeringSupported,
  MIXABLE_COLOR_TYPES,
  rgbToHex,
  toColorIds,
  WHITE_HEX,
} from '@eugene-khyst/artistassistapp-color-mixer';
import {Trans, useLingui} from '@lingui/react/macro';
import {Button, Dropdown, Form, Grid, Space, Typography} from 'antd';
import type {MenuProps} from 'antd/lib';
import {saveAs} from 'file-saver';
import * as htmlToImage from 'html-to-image';
import {Fragment, useRef, useState} from 'react';

import {ColorLabel} from '@/components/color/ColorLabel';
import {ColorSquare} from '@/components/color/ColorSquare';
import {LoadingIndicator} from '@/components/loading/LoadingIndicator';
import {COLOR_SORT_LABELS} from '@/components/messages';
import {columnCountStyle} from '@/components/utils';
import {useColorSetReset} from '@/hooks/useColorSetReset';
import {printImages} from '@/services/print/print';
import {useAppStore} from '@/stores/app-store';

import {ColorCascader} from './color-set/ColorCascader';
import styles from './ColorMixingChart.module.css';
import {EmptyColorSet} from './empty/EmptyColorSet';

function colorKey({brand, id}: {brand: number; id: number}): string {
  return `${brand}-${id}`;
}

export function ColorMixingChart() {
  const colorSet = useAppStore(state => state.colorSet);
  const colorMixingChartSet = useAppStore(state => state.colorMixingChartSet);
  const colorMixingChartMixtures = useAppStore(state => state.colorMixingChartMixtures);

  const isColorMixingChartLoading = useAppStore(state => state.isColorMixingChartLoading);

  const setColorMixingChartColors = useAppStore(state => state.setColorMixingChartColors);
  const abortColorMixingChart = useAppStore(state => state.abortColorMixingChart);

  const screens = Grid.useBreakpoint();

  const {t} = useLingui();

  const [colorIds, setColorIds] = useState<ColorId[]>([]);
  const [sort, setSort] = useState<ColorSort | undefined>(ColorSort.ByHue);

  const chartRef = useRef<HTMLDivElement>(null);

  const isLoading: boolean = isColorMixingChartLoading;

  useColorSetReset(colorIds, () => {
    setColorIds(toColorIds(colorMixingChartSet?.colors));
  });

  if (!colorSet || !isMixable(colorSet.type)) {
    return <EmptyColorSet supportedColorTypes={MIXABLE_COLOR_TYPES} />;
  }

  const handleApplyClick = (sort?: ColorSort) => {
    if (!colorIds.length) {
      return;
    }
    void setColorMixingChartColors(colorIds, sort);
  };

  const getColorMixingChartImage = async (): Promise<Blob | null> => {
    if (!chartRef.current) {
      return null;
    }
    return htmlToImage.toBlob(chartRef.current, {
      skipFonts: true,
      backgroundColor: WHITE_HEX,
    });
  };

  const handlePrintClick = async () => {
    const blob: Blob | null = await getColorMixingChartImage();
    if (blob) {
      void printImages(blob);
    }
  };

  const handleSaveClick = async () => {
    const blob: Blob | null = await getColorMixingChartImage();
    if (blob) {
      saveAs(blob, 'color-mixing-chart.png');
    }
  };

  const items: MenuProps['items'] = [
    {
      key: 'sort',
      label: <Trans>Sort</Trans>,
      icon: <SortAscendingOutlined />,
      children: [
        {
          key: 'no-sorting',
          label: <Trans>No sorting</Trans>,
          onClick: () => {
            if (sort) {
              setSort(undefined);
              handleApplyClick();
            }
          },
        },
        ...[ColorSort.ById, ColorSort.ByHue].map(value => ({
          key: `sort-${value}`,
          label: t(COLOR_SORT_LABELS[value]),
          onClick: () => {
            if (sort !== value) {
              setSort(value);
              handleApplyClick(value);
            }
          },
        })),
      ],
    },
    {
      key: 'print',
      label: <Trans>Print</Trans>,
      icon: <PrinterOutlined />,
      onClick: () => {
        void handlePrintClick();
      },
      disabled: !colorMixingChartMixtures.length,
    },
    {
      key: 'save',
      label: <Trans>Save</Trans>,
      icon: <DownloadOutlined />,
      onClick: () => {
        void handleSaveClick();
      },
      disabled: !colorMixingChartMixtures.length,
    },
  ];

  return (
    <LoadingIndicator loading={isLoading} onCancel={abortColorMixingChart}>
      <div className={styles['scroll']}>
        <Form.Item
          label={<Trans>Colors</Trans>}
          labelCol={{className: 'u-pb-0'}}
          tooltip={
            isTransparentLayeringSupported(colorSet.type) ? (
              <Trans>
                On the diagonal are the pure colors at full strength. Above the diagonal are thick
                layers of each pair mixed in a 1:1 ratio. Below the diagonal are the same mixtures
                thinned to 1/2 strength.
              </Trans>
            ) : (
              <Trans>
                On the diagonal are the pure colors at full strength. Off the diagonal is each pair
                mixed in a 1:1 ratio.
              </Trans>
            )
          }
          className={styles['colorsFormItem']}
          extra={
            <Typography.Text type="secondary">
              <Trans>Select colors to build a mixing chart</Trans>
            </Typography.Text>
          }
        >
          <Space.Compact block>
            <ColorCascader
              value={colorIds}
              onChange={setColorIds}
              multiple
              maxTagCount="responsive"
            />
            <Button
              type="primary"
              onClick={() => {
                handleApplyClick(sort);
              }}
              disabled={!colorIds.length}
            >
              <Trans>Apply</Trans>
            </Button>
            <Dropdown
              menu={{
                items,
                selectedKeys: [sort ? `sort-${sort}` : 'no-sorting'],
              }}
              trigger={['click']}
            >
              <Button icon={<DownOutlined />} />
            </Dropdown>
          </Space.Compact>
        </Form.Item>

        {colorMixingChartSet?.colors && colorMixingChartMixtures.length > 0 && (
          <div
            ref={chartRef}
            className={`u-color-grid ${styles['chart']}`}
            style={columnCountStyle(colorMixingChartSet.colors.length)}
          >
            {/* Header row */}
            <div className={styles['stickyCorner']} />
            {colorMixingChartSet.colors.map(color => (
              <div key={`header-${colorKey(color)}`} className={styles['stickyHeader']}>
                <span className={styles['verticalLabel']}>
                  <ColorLabel
                    color={color}
                    brand={colorMixingChartSet.brands.get(color.brand)!}
                    showHex={false}
                    showWarmth={false}
                    showOpacity={screens.md}
                    showBrandName
                  />
                </span>
                <ColorSquare hex={rgbToHex(...color.rgb)} size="large" />
              </div>
            ))}
            {/* Data rows */}
            {colorMixingChartMixtures.map((colorMixtures, i) => {
              const color = colorMixingChartSet.colors[i]!;
              return (
                <Fragment key={`row-${colorKey(color)}`}>
                  <div className={styles['stickyRowHeader']}>
                    <ColorLabel
                      color={color}
                      brand={colorMixingChartSet.brands.get(color.brand)!}
                      showHex={false}
                      showWarmth={false}
                      showOpacity={screens.md}
                      showBrandName
                    />
                    <ColorSquare hex={rgbToHex(...color.rgb)} size="large" />
                  </div>
                  {colorMixtures.map(({layerRgb, key}) => (
                    <ColorSquare key={key} hex={rgbToHex(...layerRgb)} size="large" />
                  ))}
                </Fragment>
              );
            })}
          </div>
        )}
      </div>
    </LoadingIndicator>
  );
}
