/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {MoreOutlined, PrinterOutlined} from '@ant-design/icons';
import type {CheckboxOptionType, MenuProps, RadioChangeEvent} from 'antd';
import {Button, Col, Dropdown, Grid, Radio, Row, Space, Spin} from 'antd';
import {useEffect, useState} from 'react';

import {useZoomableImageCanvas, zoomableImageCanvasSupplier} from '~/src/hooks';
import {usePrintImages} from '~/src/hooks';
import type {ZoomableImageCanvas} from '~/src/services/canvas/image';
import {useAppStore} from '~/src/stores/app-store';

import {EmptyImage} from './empty/EmptyImage';

const TONES_OPTIONS: CheckboxOptionType[] = [
  {value: 0, label: 'Light tone'},
  {value: 1, label: 'Mid tone'},
  {value: 2, label: 'Shadow'},
];

export const ImageTonalValues: React.FC = () => {
  const originalImage = useAppStore(state => state.originalImage);
  const tonalImages = useAppStore(state => state.tonalImages);

  const isOriginalImageLoading = useAppStore(state => state.isOriginalImageLoading);
  const isTonalImagesLoading = useAppStore(state => state.isTonalImagesLoading);

  const screens = Grid.useBreakpoint();

  const {ref: tonalValuesCanvasRef, zoomableImageCanvas: tonalValuesZoomableImageCanvas} =
    useZoomableImageCanvas<ZoomableImageCanvas>(zoomableImageCanvasSupplier, tonalImages);

  const {ref: originalCanvasRef} = useZoomableImageCanvas<ZoomableImageCanvas>(
    zoomableImageCanvasSupplier,
    originalImage
  );

  const [tonalValuesImageIndex, setTonalValuesImageIndex] = useState<number>(0);

  const isLoading: boolean = isOriginalImageLoading || isTonalImagesLoading;

  useEffect(() => {
    tonalValuesZoomableImageCanvas?.setImageIndex(tonalValuesImageIndex);
  }, [tonalValuesZoomableImageCanvas, tonalValuesImageIndex]);

  const {ref: printRef, printImagesUrls, handlePrint} = usePrintImages(tonalImages);

  const handleTonalValueChange = (e: RadioChangeEvent) => {
    setTonalValuesImageIndex(e.target.value as number);
  };

  const items: MenuProps['items'] = [
    {
      key: '1',
      label: 'Print',
      icon: <PrinterOutlined />,
      onClick: handlePrint,
    },
  ];

  if (!originalImage) {
    return (
      <div style={{padding: '0 16px 16px'}}>
        <EmptyImage feature="view tonal values" tab="Tonal values" />
      </div>
    );
  }

  const height = `calc((100vh - 115px) / ${screens['sm'] ? 1 : 2})`;

  return (
    <Spin spinning={isLoading} tip="Loading" size="large">
      <Space
        size="small"
        align="center"
        style={{width: '100%', justifyContent: 'center', marginBottom: 8}}
      >
        <Radio.Group
          options={TONES_OPTIONS}
          value={tonalValuesImageIndex}
          onChange={handleTonalValueChange}
          optionType="button"
          buttonStyle="solid"
        />
        {screens['sm'] ? (
          <Button icon={<PrinterOutlined />} onClick={handlePrint}>
            Print
          </Button>
        ) : (
          <Dropdown menu={{items}}>
            <Button icon={<MoreOutlined />} />
          </Dropdown>
        )}
      </Space>
      <Row>
        <Col xs={24} sm={12}>
          <canvas ref={tonalValuesCanvasRef} style={{width: '100%', height}} />
        </Col>
        <Col xs={24} sm={12}>
          <canvas ref={originalCanvasRef} style={{width: '100%', height}} />
        </Col>
      </Row>
      <div style={{display: 'none'}}>
        <div ref={printRef}>
          {printImagesUrls.map((url: string, i: number) => (
            <img key={i} src={url} style={{breakAfter: 'always'}} />
          ))}
        </div>
      </div>
    </Spin>
  );
};
