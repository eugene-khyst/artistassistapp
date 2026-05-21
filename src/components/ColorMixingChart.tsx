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
import {Trans, useLingui} from '@lingui/react/macro';
import {Button, Dropdown, Form, Grid, Space, Typography} from 'antd';
import type {MenuProps} from 'antd/lib';
import {saveAs} from 'file-saver';
import * as htmlToImage from 'html-to-image';
import {Fragment, useRef, useState} from 'react';

import {ColorLabel} from '~/src/components/color/ColorLabel';
import {ColorSquare} from '~/src/components/color/ColorSquare';
import {LoadingIndicator} from '~/src/components/loading/LoadingIndicator';
import {COLOR_SORT_LABELS} from '~/src/components/messages';
import {isMixable, MIXABLE_COLOR_TYPES} from '~/src/services/color/color-mixer';
import {ColorSort} from '~/src/services/color/colors';
import {rgbToHex, WHITE_HEX} from '~/src/services/color/space/rgb';
import type {ColorId} from '~/src/services/color/types';
import {printImages} from '~/src/services/print/print';
import {useAppStore} from '~/src/stores/app-store';
import type {CssVariables} from '~/src/utils/types';

import {ColorCascader} from './color-set/ColorCascader';
import styles from './ColorMixingChart.module.css';
import {EmptyColorSet} from './empty/EmptyColorSet';

function getChartStyle(colorCount: number): CssVariables {
  return {'--chart-color-count': colorCount};
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

  const [prevColorSet, setPrevColorSet] = useState(colorSet);
  if (colorSet !== prevColorSet) {
    setPrevColorSet(colorSet);
    setColorIds([]);
  }

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
      label: t`Sort`,
      icon: <SortAscendingOutlined />,
      children: [
        {
          key: 'no-sorting',
          label: t`No sorting`,
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
      label: t`Print`,
      icon: <PrinterOutlined />,
      onClick: () => {
        void handlePrintClick();
      },
      disabled: !colorMixingChartMixtures.length,
    },
    {
      key: 'save',
      label: t`Save`,
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
          label={t`Colors`}
          labelCol={{className: 'u-pb-0'}}
          tooltip={t`A grid showing the result of mixing each pair of selected colors`}
          className={styles['colorsFormItem']}
          extra={
            <Typography.Text type="secondary">
              <Trans>Select colors to build a mixing chart</Trans>
            </Typography.Text>
          }
        >
          <Space.Compact className="u-flex">
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
            className={styles['chart']}
            style={getChartStyle(colorMixingChartSet.colors.length)}
          >
            {/* Header row */}
            <div className={styles['stickyCorner']} />
            {colorMixingChartSet.colors.map((color, i) => (
              <div key={`header-${i}`} className={styles['stickyHeader']}>
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
                <Fragment key={`row-${i}`}>
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
                  {colorMixtures.map(({layerRgb}, j) => (
                    <ColorSquare key={`cell-${i}-${j}`} hex={rgbToHex(...layerRgb)} size="large" />
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
