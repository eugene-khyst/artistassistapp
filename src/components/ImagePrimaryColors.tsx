/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {PictureOutlined} from '@ant-design/icons';
import {Button, Col, Flex, Form, Grid, Row, Spin, Typography} from 'antd';
import {Remote, wrap} from 'comlink';
import {useEffect, useMemo, useState} from 'react';
import {useZoomableImageCanvas, zoomableImageCanvasSupplier} from '~/src/hooks';
import {useCreateImageBitmap} from '~/src/hooks/useCreateImageBitmap';
import {ZoomableImageCanvas} from '~/src/services/canvas/image';
import {Paint, PaintSet} from '~/src/services/color';
import {PrimaryColors} from '~/src/services/image';
import {PaintCascader} from './color/PaintCascader';
import {EmptyPaintSet} from './empty/EmptyPaintSet';

const MAX_COLORS = 5;

const primaryColors: Remote<PrimaryColors> = wrap(
  new Worker(new URL('../services/image/worker/primary-colors-worker.ts', import.meta.url), {
    type: 'module',
  })
);

type Props = {
  paintSet?: PaintSet;
  blob?: Blob;
  images: ImageBitmap[];
  isImagesLoading: boolean;
};

export const ImagePrimaryColors: React.FC<Props> = ({
  paintSet,
  blob,
  images: original,
  isImagesLoading: isOriginalLoading,
}: Props) => {
  const screens = Grid.useBreakpoint();

  const [colors, setColors] = useState<(string | number)[][]>([]);
  const [limitedPaintSet, setLimitedPaintSet] = useState<PaintSet | undefined>();

  const primaryColorsBlobToImageBitmapsConverter = useMemo(
    () =>
      async (blob: Blob): Promise<ImageBitmap[]> => {
        if (!limitedPaintSet) {
          return [];
        }
        const {preview} = await primaryColors.getPreview(blob, limitedPaintSet);
        return preview ? [preview] : [];
      },
    [limitedPaintSet]
  );

  const {images: preview, isLoading: isPreviewLoading} = useCreateImageBitmap(
    primaryColorsBlobToImageBitmapsConverter,
    blob
  );

  const {ref: primaryColorsCanvasRef} = useZoomableImageCanvas<ZoomableImageCanvas>(
    zoomableImageCanvasSupplier,
    preview
  );

  const {ref: originalCanvasRef} = useZoomableImageCanvas<ZoomableImageCanvas>(
    zoomableImageCanvasSupplier,
    original
  );

  useEffect(() => {
    setColors([]);
    setLimitedPaintSet(undefined);
  }, [paintSet]);

  const isLoading: boolean = isPreviewLoading || isOriginalLoading;

  const handlePaintChange = (value: (string | number)[] | (string | number)[][]) => {
    const colors = value as (string | number)[][];
    setColors(colors);
  };

  const handlePreviewClick = () => {
    if (paintSet) {
      const limitedPaintSet: PaintSet = {
        type: paintSet?.type,
        colors: colors.flatMap(([paintBrand, paintId]) => {
          const paint = paintSet?.colors.find(
            ({brand, id}: Paint) => paintBrand === brand && paintId === id
          );
          return paint ? [paint] : [];
        }),
      };
      setLimitedPaintSet(limitedPaintSet);
    }
  };

  if (!paintSet || !blob) {
    return (
      <div style={{padding: '0 16px 16px'}}>
        <EmptyPaintSet feature="limited palette" tab="Limited palette" photoMandatory={true} />
      </div>
    );
  }

  const height = `calc((100vh - 130px) / ${screens['sm'] ? 1 : 2})`;

  return (
    <Spin spinning={isLoading} tip="Loading" size="large" delay={300}>
      <div style={{padding: '0 16px'}}>
        <Flex gap="small" align="baseline" style={{width: '100%', justifyContent: 'center'}}>
          <Form.Item
            label="Primary colors"
            tooltip="Using a limited palette helps achieve color harmony. Select up to 5 colors to be your primaries."
            style={{marginBottom: 0, flexGrow: 1}}
            {...(screens['sm']
              ? {
                  extra: (
                    <Typography.Text type={colors.length > MAX_COLORS ? 'danger' : 'secondary'}>
                      Select from 1 to 5 colors
                    </Typography.Text>
                  ),
                }
              : null)}
            {...(colors.length > MAX_COLORS ? {validateStatus: 'error'} : null)}
          >
            <PaintCascader
              value={colors}
              onChange={handlePaintChange}
              paints={paintSet?.colors}
              multiple
              maxTagCount="responsive"
            />
          </Form.Item>
          <Button
            icon={<PictureOutlined />}
            type="primary"
            onClick={handlePreviewClick}
            disabled={colors.length == 0 || colors.length > MAX_COLORS}
          >
            Preview
          </Button>
        </Flex>
      </div>
      <Row>
        <Col xs={24} sm={12}>
          <canvas ref={primaryColorsCanvasRef} style={{width: '100%', height}} />
        </Col>
        <Col xs={24} sm={12}>
          <canvas ref={originalCanvasRef} style={{width: '100%', height}} />
        </Col>
      </Row>
    </Spin>
  );
};
