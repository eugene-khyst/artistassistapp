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
import {Button, Dropdown, Form, Space, Typography} from 'antd';
import type {MenuProps} from 'antd/lib';
import {saveAs} from 'file-saver';
import * as htmlToImage from 'html-to-image';
import {Fragment, useEffect, useRef, useState} from 'react';

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

import {ColorCascader} from './color-set/ColorCascader';
import {EmptyColorSet} from './empty/EmptyColorSet';

export const ColorMixingChart: React.FC = () => {
  const colorSet = useAppStore(state => state.colorSet);
  const colorMixingChartSet = useAppStore(state => state.colorMixingChartSet);
  const colorMixingChartMixtures = useAppStore(state => state.colorMixingChartMixtures);

  const isColorMixingChartLoading = useAppStore(state => state.isColorMixingChartLoading);

  const setColorMixingChartColors = useAppStore(state => state.setColorMixingChartColors);
  const abortColorMixingChart = useAppStore(state => state.abortColorMixingChart);

  const {t} = useLingui();

  const [colorIds, setColorIds] = useState<ColorId[]>([]);
  const [sort, setSort] = useState<ColorSort | undefined>(ColorSort.ByHue);

  const chartRef = useRef<HTMLDivElement>(null);

  const isLoading: boolean = isColorMixingChartLoading;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setColorIds([]);
  }, [colorSet]);

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
      <div
        style={{
          overflow: 'auto',
          minHeight: 250,
          maxHeight: 'calc(100dvh - 60px)',
        }}
      >
        <Form.Item
          label={t`Colors`}
          tooltip={t`A grid showing the result of mixing each pair of selected colors`}
          style={{flexGrow: 1, marginBottom: 0, padding: '0 16px'}}
          extra={
            <Typography.Text type="secondary">
              <Trans>Select colors to build a mixing chart</Trans>
            </Typography.Text>
          }
        >
          <Space.Compact style={{display: 'flex'}}>
            <ColorCascader
              value={colorIds}
              onChange={value => {
                setColorIds(value);
              }}
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
            style={{
              display: 'grid',
              gridTemplateColumns: `auto repeat(${colorMixingChartSet.colors.length}, auto)`,
              gap: 8,
              alignItems: 'center',
              width: 'max-content',
              padding: 8,
              boxSizing: 'content-box',
            }}
          >
            {/* Header row */}
            <div
              style={{
                position: 'sticky',
                top: 0,
                left: 0,
                zIndex: 3,
                alignSelf: 'stretch',
                backgroundColor: 'white',
              }}
            />
            {colorMixingChartSet.colors.map((color, i) => (
              <div
                key={`header-${i}`}
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 2,
                  alignSelf: 'stretch',
                  backgroundColor: 'white',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 4,
                }}
              >
                <span style={{writingMode: 'sideways-lr'}}>
                  <ColorLabel
                    color={color}
                    brand={colorMixingChartSet.brands.get(color.brand)!}
                    showHex={false}
                    showWarmth={false}
                    showBrandName
                  />
                </span>
                <ColorSquare hex={rgbToHex(...color.rgb)} size="large" showTooltip={false} />
              </div>
            ))}
            {/* Data rows */}
            {colorMixingChartMixtures.map((colorMixtures, i) => {
              const color = colorMixingChartSet.colors[i]!;
              return (
                <Fragment key={`row-${i}`}>
                  <div
                    style={{
                      position: 'sticky',
                      left: 0,
                      zIndex: 1,
                      alignSelf: 'stretch',
                      backgroundColor: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: 8,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <ColorLabel
                      color={color}
                      brand={colorMixingChartSet.brands.get(color.brand)!}
                      showHex={false}
                      showWarmth={false}
                      showBrandName
                    />
                    <ColorSquare hex={rgbToHex(...color.rgb)} size="large" showTooltip={false} />
                  </div>
                  {colorMixtures.map(({layerRgb}, j) => (
                    <ColorSquare
                      key={`cell-${i}-${j}`}
                      hex={rgbToHex(...layerRgb)}
                      size="large"
                      showTooltip={false}
                    />
                  ))}
                </Fragment>
              );
            })}
          </div>
        )}
      </div>
    </LoadingIndicator>
  );
};
