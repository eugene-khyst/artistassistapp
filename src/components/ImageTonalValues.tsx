/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  EllipsisOutlined,
  MergeCellsOutlined,
  PrinterOutlined,
  SplitCellsOutlined,
} from '@ant-design/icons';
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
import {blobToImageBitmapsConverter, useCreateImageBitmap} from '../hooks/useCreateImageBitmap';
import {ZoomableImageCanvas} from '../services/canvas/image';
import {TonalValues} from '../services/image';
import {imageBitmapToOffscreenCanvas} from '../utils';

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
  return (await tonalValues.getTones(blob, THRESHOLDS, MEDIAN_FILTER_RADIUS)).tones;
};

type Props = {
  blob?: Blob;
};

export const ImageTonalValues: React.FC<Props> = ({blob}: Props) => {
  const screens = Grid.useBreakpoint();

  const {images: tonalValues, isLoading: isTonalValuesLoading} = useCreateImageBitmap(
    tonalValuesBlobToImageBitmapsConverter,
    blob
  );
  const {images: original, isLoading: isOriginalLoading} = useCreateImageBitmap(
    blobToImageBitmapsConverter,
    blob
  );

  const {ref: tonalValuesCanvasRef, zoomableImageCanvasRef: tonalValuesZoomableImageCanvasRef} =
    useZoomableImageCanvas<ZoomableImageCanvas>(zoomableImageCanvasSupplier, tonalValues);
  const {ref: originalCanvasRef} = useZoomableImageCanvas<ZoomableImageCanvas>(
    zoomableImageCanvasSupplier,
    original
  );

  const [tonalValuesImageIndex, setTonalValuesImageIndex] = useState<number>(0);

  const [isOriginalVisible, setIsOriginalVisible] = useState<boolean>(true);

  const printRef = useRef<HTMLDivElement>(null);
  const promiseResolveRef = useRef<any>(null);
  const [printImagesUrls, setPrintImagesUrls] = useState<string[]>([]);

  const isLoading: boolean = isTonalValuesLoading || isOriginalLoading;

  useEffect(() => {
    tonalValuesZoomableImageCanvasRef.current?.setImageIndex(tonalValuesImageIndex);
  }, [tonalValuesZoomableImageCanvasRef, tonalValuesImageIndex]);

  useEffect(() => {
    tonalValuesZoomableImageCanvasRef.current?.resize();
  }, [tonalValuesZoomableImageCanvasRef, isOriginalVisible]);

  useEffect(() => {
    if (printImagesUrls.length && promiseResolveRef.current) {
      promiseResolveRef.current();
    }
  }, [printImagesUrls]);

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
    {
      key: '2',
      label: isOriginalVisible ? 'Hide original image' : 'Show original image',
      icon: isOriginalVisible ? <MergeCellsOutlined /> : <SplitCellsOutlined />,
      onClick: () => setIsOriginalVisible(prev => !prev),
    },
  ];

  const canvasHeight = isOriginalVisible
    ? `calc((100vh - 115px) / ${screens['sm'] ? '1' : '2'})`
    : 'calc(100vh - 115px)';

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
          onChange={(e: RadioChangeEvent) => setTonalValuesImageIndex(e.target.value)}
          optionType="button"
          buttonStyle="solid"
        />
        <Dropdown menu={{items}}>
          <Button icon={<EllipsisOutlined />} />
        </Dropdown>
      </Space>
      <Row>
        <Col xs={24} sm={isOriginalVisible ? 12 : 24}>
          <canvas ref={tonalValuesCanvasRef} style={{width: '100%', height: canvasHeight}} />
        </Col>
        <Col xs={24} sm={12} style={{display: isOriginalVisible ? 'block' : 'none'}}>
          <canvas ref={originalCanvasRef} style={{width: '100%', height: canvasHeight}} />
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
