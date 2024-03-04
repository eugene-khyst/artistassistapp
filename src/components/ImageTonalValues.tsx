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
import {useEffect, useRef, useState} from 'react';
import {useReactToPrint} from 'react-to-print';
import {useZoomableImageCanvas, zoomableImageCanvasSupplier} from '../hooks/';
import {useCreateImageBitmap} from '../hooks/useCreateImageBitmap';
import {ZoomableImageCanvas} from '../services/canvas/image';
import {TonalValues} from '../services/image';
import {imageBitmapToOffscreenCanvas} from '../utils';
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

const tonalValuesBlobToImageBitmapsConverter = async (blob: Blob): Promise<ImageBitmap[]> => {
  const {tones} = await tonalValues.getTones(blob, THRESHOLDS, MEDIAN_FILTER_RADIUS);
  return tones;
};

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

  const {images: tonalValues, isLoading: isTonalValuesLoading} = useCreateImageBitmap(
    tonalValuesBlobToImageBitmapsConverter,
    blob
  );

  const {ref: tonalValuesCanvasRef, zoomableImageCanvas: tonalValuesZoomableImageCanvas} =
    useZoomableImageCanvas<ZoomableImageCanvas>(zoomableImageCanvasSupplier, tonalValues);

  const {ref: originalCanvasRef} = useZoomableImageCanvas<ZoomableImageCanvas>(
    zoomableImageCanvasSupplier,
    original
  );

  const [tonalValuesImageIndex, setTonalValuesImageIndex] = useState<number>(0);

  const printRef = useRef<HTMLDivElement>(null);
  const promiseResolveRef = useRef<any>(null);
  const [printImagesUrls, setPrintImagesUrls] = useState<string[]>([]);

  const isLoading: boolean = isTonalValuesLoading || isOriginalLoading;

  useEffect(() => {
    tonalValuesZoomableImageCanvas?.setImageIndex(tonalValuesImageIndex);
  }, [tonalValuesZoomableImageCanvas, tonalValuesImageIndex]);

  useEffect(() => {
    if (printImagesUrls.length && promiseResolveRef.current) {
      promiseResolveRef.current();
    }
  }, [printImagesUrls]);

  const handleTonalValueChange = (e: RadioChangeEvent) => {
    setTonalValuesImageIndex(e.target.value);
  };

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    onBeforeGetContent: async () => {
      const blobs = await Promise.all(
        tonalValues.map((image: ImageBitmap): Promise<Blob> => {
          const [canvas] = imageBitmapToOffscreenCanvas(image);
          return canvas.convertToBlob();
        })
      );
      return await new Promise<void>(resolve => {
        promiseResolveRef.current = resolve;
        const urls: string[] = blobs.map((blob: Blob): string => URL.createObjectURL(blob));
        setPrintImagesUrls(urls);
      });
    },
    onAfterPrint: () => {
      promiseResolveRef.current = null;
      printImagesUrls.forEach((url: string) => URL.revokeObjectURL(url));
      setPrintImagesUrls([]);
    },
  });

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
    <Spin spinning={isLoading} tip="Loading" size="large" delay={300}>
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
            <img key={i} src={url} style={{pageBreakAfter: 'always'}} />
          ))}
        </div>
      </div>
    </Spin>
  );
};
