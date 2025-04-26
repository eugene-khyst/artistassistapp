/**
 * ArtistAssistApp
 * Copyright (C) 2023-2025  Eugene Khyst
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

import {LoadingOutlined} from '@ant-design/icons';
import {Button, Drawer, Form, Input, InputNumber, Radio, Select, Space, Spin} from 'antd';
import type {DefaultOptionType as SelectOptionType} from 'antd/es/select';
import {useEffect, useState} from 'react';

import {useCreateObjectUrl} from '~/src/hooks/useCreateObjectUrl';
import {useDebounce} from '~/src/hooks/useDebounce';
import {
  type ImagePagesPreview,
  splitImageIntoPages,
  splitImageIntoPagesPreview,
} from '~/src/services/image/splitter';
import {LENGTH_UNITS} from '~/src/services/math/geometry';
import {LengthUnit} from '~/src/services/math/types';
import {PAPER_SIZES, printImages} from '~/src/services/print/print';
import {PaperSize} from '~/src/services/print/types';

enum PrintMode {
  Standard,
  Resize,
}

const PAPER_SIZE_OPTIONS: SelectOptionType[] = [...PAPER_SIZES.entries()].map(
  ([value, {label}]) => ({value, label})
);

const LENGTH_UNIT_OPTIONS: SelectOptionType[] = [LengthUnit.Centimeter, LengthUnit.Inch].map(
  value => ({value, label: LENGTH_UNITS.get(value)!.abbreviation})
);

interface Props {
  image?: ImageBitmap | null;
  open?: boolean;
  onClose?: () => void;
}

export const PrintImageDrawer: React.FC<Props> = ({image, open = false, onClose}: Props) => {
  const [printMode, setPrintMode] = useState<PrintMode>(PrintMode.Resize);
  const [targetWidth, setTargetWidth] = useState<number | null>();
  const [targetHeight, setTargetHeight] = useState<number | null>();
  const [targetUnit, setTargetUnit] = useState<LengthUnit>(LengthUnit.Centimeter);
  const [paperSize, setPaperSize] = useState<PaperSize>(PaperSize.A4);
  const [printPreview, setPrintPreview] = useState<ImagePagesPreview>();
  const [printPreviewBlob, setPrintPreviewBlob] = useState<Blob>();
  const [isError, setIsError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const debouncedTargetWidth = useDebounce(targetWidth, 500);
  const debouncedTargetHeight = useDebounce(targetHeight, 500);

  const previewImageUrl = useCreateObjectUrl(printPreviewBlob);

  const isPrintDisabled: boolean = printMode === PrintMode.Resize && !printPreview;

  useEffect(() => {
    setIsError(false);
    if (!image || !debouncedTargetWidth || !debouncedTargetHeight) {
      return;
    }
    setIsLoading(true);
    const {toMillimeters} = LENGTH_UNITS.get(targetUnit)!;
    try {
      const preview: ImagePagesPreview = splitImageIntoPagesPreview(
        image,
        [toMillimeters(debouncedTargetWidth), toMillimeters(debouncedTargetHeight)],
        paperSize
      );
      setPrintPreview(preview);
    } catch (e) {
      console.error(e);
      setIsError(true);
      setPrintPreview(undefined);
    }
    setIsLoading(false);
  }, [image, targetUnit, debouncedTargetWidth, debouncedTargetHeight, paperSize]);

  useEffect(() => {
    void (async () => {
      setPrintPreviewBlob(printPreview ? await printPreview.canvas.convertToBlob() : undefined);
    })();
  }, [printPreview]);

  const handlePrint = async () => {
    if (printMode === PrintMode.Resize && printPreview) {
      const {paperSize, orientation} = printPreview;
      const imagePartBlobs: Blob[] = await Promise.all(
        splitImageIntoPages(printPreview).map(canvas => canvas.convertToBlob())
      );
      void printImages(imagePartBlobs, paperSize, orientation);
    } else {
      void printImages(image);
    }
  };

  return (
    <Drawer
      title={
        <Button type="primary" onClick={() => void handlePrint()} disabled={isPrintDisabled}>
          Print
        </Button>
      }
      placement="right"
      size="large"
      open={open}
      onClose={onClose}
    >
      <Spin spinning={isLoading} tip="Loading" indicator={<LoadingOutlined spin />} size="large">
        <Space direction="vertical">
          <Radio.Group
            value={printMode}
            onChange={e => {
              setPrintMode(e.target.value as PrintMode);
            }}
          >
            <Space direction="vertical">
              <Radio value={PrintMode.Resize}>Print a large image onto multiple pages</Radio>
              <Radio value={PrintMode.Standard}>Standard print</Radio>
            </Space>
          </Radio.Group>

          {printMode === PrintMode.Resize && (
            <>
              <Form.Item label="Paper size" style={{marginBottom: 0}}>
                <Select
                  value={paperSize}
                  onChange={value => {
                    setPaperSize(value);
                  }}
                  options={PAPER_SIZE_OPTIONS}
                  style={{width: 170}}
                />
              </Form.Item>

              <Form.Item
                label="Target print size"
                style={{marginBottom: 0}}
                help={isError ? 'This print size is not supported' : null}
                validateStatus={isError ? 'error' : undefined}
              >
                <Space.Compact block>
                  <InputNumber
                    value={targetWidth}
                    onChange={value => {
                      setTargetWidth(value);
                    }}
                    min={1}
                    max={1000}
                    step={0.1}
                    placeholder="Width"
                    style={{width: 70}}
                  />
                  <Input
                    placeholder="×"
                    style={{
                      width: 30,
                      borderLeft: 0,
                      borderRight: 0,
                      pointerEvents: 'none',
                    }}
                    disabled
                  />
                  <InputNumber
                    value={targetHeight}
                    onChange={value => {
                      setTargetHeight(value);
                    }}
                    min={1}
                    max={1000}
                    step={0.1}
                    placeholder="Height"
                    style={{width: 70}}
                  />
                  <Select
                    value={targetUnit}
                    onChange={value => {
                      setTargetUnit(value);
                    }}
                    options={LENGTH_UNIT_OPTIONS}
                    style={{width: 70}}
                  />
                </Space.Compact>
              </Form.Item>

              {previewImageUrl && (
                <img
                  src={previewImageUrl}
                  alt="Print preview"
                  style={{
                    display: 'block',
                    maxWidth: '100%',
                    maxHeight: 480,
                  }}
                />
              )}
            </>
          )}
        </Space>
      </Spin>
    </Drawer>
  );
};
