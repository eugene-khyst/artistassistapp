/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Spin} from 'antd';
import {useZoomableImageCanvas} from '../hooks/';
import {ZoomableImageCanvas} from '../services/canvas/image';
import {GridCanvas} from '../services/canvas/image/grid-canvas';

const gridCanvasSupplier = (canvas: HTMLCanvasElement): GridCanvas => {
  return new GridCanvas(canvas, {
    gridRows: 4,
    gridCols: 4,
  });
};

type Props = {
  images: ImageBitmap[];
  isImagesLoading: boolean;
};

export const ImageGrid: React.FC<Props> = ({images, isImagesLoading}: Props) => {
  const {ref: canvasRef} = useZoomableImageCanvas<ZoomableImageCanvas>(gridCanvasSupplier, images);

  return (
    <Spin spinning={isImagesLoading} tip="Loading" size="large" delay={300}>
      <div>
        <canvas ref={canvasRef} style={{width: '100%', height: `calc(100vh - 70px)`}} />
      </div>
    </Spin>
  );
};
