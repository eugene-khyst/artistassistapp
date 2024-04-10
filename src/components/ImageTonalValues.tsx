/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {EllipsisOutlined, PrinterOutlined} from '@ant-design/icons';
import {
  Button,
  CheckboxOptionType,
  Col,
  Dropdown,
  Grid,
  MenuProps,
  Radio,
  RadioChangeEvent,
  Row,
  Space,
  Spin,
} from 'antd';
import {Remote, wrap} from 'comlink';
import {useEffect, useState} from 'react';
import {useZoomableImageCanvas, zoomableImageCanvasSupplier} from '~/src/hooks';
import {useCreateImageBitmap} from '~/src/hooks/useCreateImageBitmap';
import {usePrintImages} from '~/src/hooks/usePrintImages';
import {ZoomableImageCanvas} from '~/src/services/canvas/image';
import {TonalValues} from '~/src/services/image';
import {EmptyImage} from './empty/EmptyImage';

const tonalValues: Remote<TonalValues> = wrap(
  new Worker(new URL('../services/image/worker/tonal-values-worker.ts', import.meta.url), {
    type: 'module',
  })
);

const TONES_OPTIONS: CheckboxOptionType[] = [
  {value: 0, label: 'Light tone'},
  {value: 1, label: 'Mid tone'},
  {value: 2, label: 'Shadow'},
];
const THRESHOLDS = [75, 50, 25];
const MEDIAN_FILTER_RADIUS = 3;

const tonalValuesBlobToImageBitmapsConverter = async (blob: Blob): Promise<ImageBitmap[]> =>
  (await tonalValues.getTones(blob, THRESHOLDS, MEDIAN_FILTER_RADIUS)).tones;

type Props = {
  blob?: Blob;
  images: ImageBitmap[];
  isImagesLoading: boolean;
};

export const ImageTonalValues: React.FC<Props> = ({
  blob,
  images: original,
  isImagesLoading: isOriginalLoading,
}: Props) => {
  const screens = Grid.useBreakpoint();

  const {images: tonalValueImages, isLoading: isTonalValuesLoading} = useCreateImageBitmap(
    tonalValuesBlobToImageBitmapsConverter,
    blob
  );

  const {ref: tonalValuesCanvasRef, zoomableImageCanvas: tonalValuesZoomableImageCanvas} =
    useZoomableImageCanvas<ZoomableImageCanvas>(zoomableImageCanvasSupplier, tonalValueImages);

  const {ref: originalCanvasRef} = useZoomableImageCanvas<ZoomableImageCanvas>(
    zoomableImageCanvasSupplier,
    original
  );

  const [tonalValuesImageIndex, setTonalValuesImageIndex] = useState<number>(0);

  const isLoading: boolean = isTonalValuesLoading || isOriginalLoading;

  useEffect(() => {
    tonalValuesZoomableImageCanvas?.setImageIndex(tonalValuesImageIndex);
  }, [tonalValuesZoomableImageCanvas, tonalValuesImageIndex]);

  const {ref: printRef, printImagesUrls, handlePrint} = usePrintImages(tonalValueImages);

  const handleTonalValueChange = (e: RadioChangeEvent) => {
    setTonalValuesImageIndex(e.target.value);
  };

  const items: MenuProps['items'] = [
    {
      key: '1',
      label: 'Print',
      icon: <PrinterOutlined />,
      onClick: handlePrint,
    },
  ];

  if (!blob) {
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
            <Button icon={<EllipsisOutlined />} />
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
