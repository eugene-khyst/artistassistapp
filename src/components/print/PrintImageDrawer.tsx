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

import {LoadingOutlined} from '@ant-design/icons';
import {Button, Drawer, Form, Input, InputNumber, Radio, Select, Space, Spin} from 'antd';
import type {DefaultOptionType as SelectOptionType} from 'antd/es/select';
import {useEffect, useState} from 'react';

import {useCreateObjectUrl} from '~/src/hooks';
import {useDebounce} from '~/src/hooks/useDebounce';
import {splitImage} from '~/src/services/image';
import {LENGTH_UNITS, LengthUnit} from '~/src/services/math';
import {PAPER_SIZES, PaperSize, printImages} from '~/src/services/print';

enum PrintMode {
  Standard,
  Resize,
}

const PAPER_SIZE_OPTIONS: SelectOptionType[] = [...PAPER_SIZES.entries()].map(
  ([value, {name}]) => ({value, label: name})
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
  const [printPreviewBlob, setPrintPreviewBlob] = useState<Blob>();
  const [imagePartBlobs, setImagePartBlobs] = useState<Blob[]>([]);
  const [isError, setIsError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const debouncedTargetWidth = useDebounce(targetWidth, 1000);
  const debouncedTargetHeight = useDebounce(targetHeight, 1000);

  const previewImageUrl = useCreateObjectUrl(printPreviewBlob);

  const isPrintDisabled: boolean = printMode === PrintMode.Resize && !imagePartBlobs.length;

  useEffect(() => {
    void (async () => {
      setImagePartBlobs([]);
      setIsError(false);
      if (!image || !debouncedTargetWidth || !debouncedTargetHeight) {
        return;
      }
      setIsLoading(true);
      const [paperWidth, paperHeight] = PAPER_SIZES.get(paperSize)!.size;
      const {toMillimeters} = LENGTH_UNITS.get(targetUnit)!;
      try {
        const {preview, imageParts} = splitImage(
          image,
          [toMillimeters(debouncedTargetWidth), toMillimeters(debouncedTargetHeight)],
          [
            [paperWidth, paperHeight],
            [paperHeight, paperWidth],
          ]
        );
        const previewBlob = await preview.convertToBlob();
        const imagePartBlobs = await Promise.all(imageParts.map(canvas => canvas.convertToBlob()));
        setPrintPreviewBlob(previewBlob);
        setImagePartBlobs(imagePartBlobs);
      } catch (e) {
        console.error(e);
        setIsError(true);
        setPrintPreviewBlob(undefined);
      }
      setIsLoading(false);
    })();
  }, [image, targetUnit, debouncedTargetWidth, debouncedTargetHeight, paperSize]);

  const handlePrint = () => {
    void printImages(printMode === PrintMode.Resize ? imagePartBlobs : image);
  };

  return (
    <Drawer
      title={
        <Button type="primary" onClick={handlePrint} disabled={isPrintDisabled}>
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
                <img src={previewImageUrl} style={{maxWidth: '100%', maxHeight: 480}} />
              )}
            </>
          )}
        </Space>
      </Spin>
    </Drawer>
  );
};
