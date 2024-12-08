/**
 * ArtistAssistApp
 * Copyright (C) 2023-2024  Eugene Khyst
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
  LoadingOutlined,
  PictureOutlined,
  ScissorOutlined,
} from '@ant-design/icons';
import {Button, Checkbox, Col, Form, Grid, Row, Slider, Space, Spin, Typography} from 'antd';
import type {CheckboxChangeEvent} from 'antd/es/checkbox';
import type {SliderMarks} from 'antd/es/slider';
import type {ChangeEvent} from 'react';
import {useEffect, useMemo, useState} from 'react';

import {AdCard} from '~/src/components/ad/AdCard';
import {ImageSelect} from '~/src/components/image/ImageSelect';
import {useZoomableImageCanvas, zoomableImageCanvasSupplier} from '~/src/hooks';
import {useDebounce} from '~/src/hooks/useDebounce';
import type {ZoomableImageCanvas} from '~/src/services/canvas/image';
import {blobToImageFile} from '~/src/services/image';
import {useAppStore} from '~/src/stores/app-store';
import {TabKey} from '~/src/tabs';

const MIN_PERCENTILE = 80;
const MAX_PERCENTILE = 100;
const PERCENTILE_SLIDER_MARKS: SliderMarks = Object.fromEntries(
  [80, 85, 90, 95, 100].map((i: number) => [i, i])
);

const MIN_SATURATION = 80;
const MAX_SATURATION = 130;
const SATURATION_SLIDER_MARKS: SliderMarks = Object.fromEntries(
  [80, 90, 100, 110, 120, 130].map((i: number) => [i, i])
);

const IMAGE_FILENAME = 'ArtistAssistApp-Adjusted';

export const ImageColorCorrection: React.FC = () => {
  const unadjustedImage = useAppStore(state => state.unadjustedImage);
  const adjustedImage = useAppStore(state => state.adjustedImage);

  const isAdjustedImageLoading = useAppStore(state => state.isAdjustedImageLoading);

  const setActiveTabKey = useAppStore(state => state.setActiveTabKey);
  const setImageToAdjust = useAppStore(state => state.setImageToAdjust);
  const setImageToRemoveBg = useAppStore(state => state.setImageToRemoveBg);
  const adjustImageColor = useAppStore(state => state.adjustImageColor);
  const saveRecentImageFile = useAppStore(state => state.saveRecentImageFile);

  const screens = Grid.useBreakpoint();

  const images = useMemo<(ImageBitmap | null)[]>(
    () => [adjustedImage, unadjustedImage],
    [unadjustedImage, adjustedImage]
  );

  const {ref: canvasRef, zoomableImageCanvas} = useZoomableImageCanvas<ZoomableImageCanvas>(
    zoomableImageCanvasSupplier,
    images
  );

  const [percentile, setPercentile] = useState<number>(98);
  const [saturation, setSaturation] = useState<number>(100);
  const [isPreview, setIsPreview] = useState<boolean>(true);

  const debouncedPercentile = useDebounce(percentile, 500);
  const debouncedSaturation = useDebounce(saturation, 500);

  const isLoading: boolean = isAdjustedImageLoading;

  useEffect(() => {
    if (unadjustedImage) {
      void adjustImageColor(debouncedPercentile, debouncedSaturation);
    }
  }, [adjustImageColor, debouncedPercentile, debouncedSaturation, unadjustedImage]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file: File | null = e.target.files?.[0] ?? null;
    void setImageToAdjust(file);
  };

  const handleSaturationChange = (value: number) => {
    setSaturation(value);
  };

  const handlePercentileChange = (value: number) => {
    setPercentile(value);
  };

  const handlePreviewChange = ({target: {checked}}: CheckboxChangeEvent) => {
    setIsPreview(checked);
    zoomableImageCanvas?.setImageIndex(checked ? 0 : 1);
  };

  const handleSetAsReferenceClick = async () => {
    const blob: Blob | undefined =
      zoomableImageCanvas && (await zoomableImageCanvas.convertToBlob());
    if (blob) {
      void saveRecentImageFile(await blobToImageFile(blob, IMAGE_FILENAME));
    }
  };

  const handleRemoveBgClick = async () => {
    const blob: Blob | undefined =
      zoomableImageCanvas && (await zoomableImageCanvas.convertToBlob());
    if (blob) {
      setImageToRemoveBg(
        new File([blob], IMAGE_FILENAME, {
          type: blob.type,
          lastModified: Date.now(),
        })
      );
      void setActiveTabKey(TabKey.BackgroundRemove);
    }
  };

  const height = `calc((100vh - 75px) / ${screens.sm ? '1' : '2 - 8px'})`;
  const margin = screens.sm ? 0 : 8;

  return (
    <>
      <Spin spinning={isLoading} tip="Loading" indicator={<LoadingOutlined spin />} size="large">
        <Row>
          {unadjustedImage && (
            <Col xs={24} sm={12} lg={16}>
              <canvas
                ref={canvasRef}
                style={{
                  width: '100%',
                  height,
                  marginBottom: margin,
                }}
              />
            </Col>
          )}
          <Col
            xs={24}
            sm={12}
            lg={8}
            style={{
              maxHeight: height,
              marginTop: margin,
              overflowY: 'auto',
            }}
          >
            <Space direction="vertical" style={{display: 'flex', padding: '0 16px 16px'}}>
              {!unadjustedImage && (
                <Typography.Text strong>
                  Select a photo to adjust white balance and saturation
                </Typography.Text>
              )}

              <Space>
                <ImageSelect onChange={handleFileChange}>Select photo</ImageSelect>
                {unadjustedImage && (
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={() => void zoomableImageCanvas?.saveAsImage(IMAGE_FILENAME)}
                  >
                    Save
                  </Button>
                )}
              </Space>

              {unadjustedImage && (
                <>
                  <Space>
                    <Button
                      size="small"
                      icon={<PictureOutlined />}
                      onClick={() => void handleSetAsReferenceClick()}
                    >
                      Set as reference
                    </Button>
                    <Button
                      size="small"
                      icon={<ScissorOutlined />}
                      onClick={() => void handleRemoveBgClick()}
                    >
                      Remove background
                    </Button>
                  </Space>

                  <Form.Item
                    layout="vertical"
                    label="White patch %ile"
                    tooltip="Smaller percentile values correspond to stronger whitening"
                    style={{marginBottom: 0}}
                  >
                    <Slider
                      value={percentile}
                      onChange={handlePercentileChange}
                      min={MIN_PERCENTILE}
                      max={MAX_PERCENTILE}
                      marks={PERCENTILE_SLIDER_MARKS}
                    />
                  </Form.Item>

                  <Form.Item
                    layout="vertical"
                    label="Saturation %"
                    tooltip="A value less than 100% desaturates the image, and a value greater than 100% over-saturates it"
                    style={{marginBottom: 0}}
                  >
                    <Slider
                      value={saturation}
                      onChange={handleSaturationChange}
                      min={MIN_SATURATION}
                      max={MAX_SATURATION}
                      marks={SATURATION_SLIDER_MARKS}
                    />
                  </Form.Item>

                  <Form.Item label="Preview" tooltip="" style={{marginBottom: 0}}>
                    <Checkbox checked={isPreview} onChange={handlePreviewChange} />
                  </Form.Item>
                </>
              )}
              <AdCard vertical />
            </Space>
          </Col>
        </Row>
      </Spin>
    </>
  );
};
