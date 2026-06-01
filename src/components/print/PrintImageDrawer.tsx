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

import {Trans, useLingui} from '@lingui/react/macro';
import {Button, Drawer, Form, Input, InputNumber, Radio, Select, Space} from 'antd';
import type {DefaultOptionType as SelectOptionType} from 'antd/es/select';
import {useEffect, useState} from 'react';

import {LoadingIndicator} from '@/components/loading/LoadingIndicator';
import {useCreateObjectUrl} from '@/hooks/useCreateObjectUrl';
import {useDebounce} from '@/hooks/useDebounce';
import {
  type ImagePagesPreview,
  MarginError,
  splitImageIntoPages,
  splitImageIntoPagesPreview,
  TargetSizeError,
} from '@/services/image/splitter';
import {LENGTH_UNITS} from '@/services/math/geometry';
import {LengthUnit} from '@/services/math/types';
import {PAPER_SIZES, printImages} from '@/services/print/print';
import {PaperSize} from '@/services/print/types';

import styles from './PrintImageDrawer.module.css';

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

export function PrintImageDrawer({image, open = false, onClose}: Readonly<Props>) {
  const {t} = useLingui();

  const [printMode, setPrintMode] = useState<PrintMode>(PrintMode.Resize);
  const [targetWidth, setTargetWidth] = useState<number | null>();
  const [targetHeight, setTargetHeight] = useState<number | null>();
  const [targetUnit, setTargetUnit] = useState<LengthUnit>(LengthUnit.Centimeter);
  const [paperSize, setPaperSize] = useState<PaperSize>(PaperSize.A4);
  const [margin, setMargin] = useState<number>(0);
  const [printPreview, setPrintPreview] = useState<ImagePagesPreview>();
  const [printPreviewBlob, setPrintPreviewBlob] = useState<Blob>();
  const [isTargetSizeError, setIsTargetSizeError] = useState<boolean>(false);
  const [isMarginError, setIsMarginError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const debouncedTargetWidth = useDebounce(targetWidth, 500);
  const debouncedTargetHeight = useDebounce(targetHeight, 500);
  const debouncedMargin = useDebounce(margin, 500);

  const previewImageUrl = useCreateObjectUrl(printPreviewBlob);

  const isPrintDisabled: boolean = printMode === PrintMode.Resize && !printPreview;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsTargetSizeError(false);
    setIsMarginError(false);
    if (!image || !debouncedTargetWidth || !debouncedTargetHeight) {
      return;
    }
    setIsLoading(true);
    try {
      const {toMillimeters} = LENGTH_UNITS.get(targetUnit)!;
      const preview: ImagePagesPreview = splitImageIntoPagesPreview(
        image,
        [toMillimeters(debouncedTargetWidth), toMillimeters(debouncedTargetHeight)],
        paperSize,
        toMillimeters(debouncedMargin)
      );
      setPrintPreview(preview);
    } catch (e) {
      console.error(e);
      setPrintPreview(undefined);
      if (e instanceof TargetSizeError) {
        setIsTargetSizeError(true);
      } else if (e instanceof MarginError) {
        setIsMarginError(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [image, targetUnit, debouncedTargetWidth, debouncedTargetHeight, paperSize, debouncedMargin]);

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
          <Trans>Print</Trans>
        </Button>
      }
      placement="right"
      size="large"
      open={open}
      onClose={onClose}
    >
      <LoadingIndicator loading={isLoading}>
        <Space orientation="vertical">
          <Radio.Group
            value={printMode}
            onChange={e => {
              setPrintMode(e.target.value as PrintMode);
            }}
          >
            <Space orientation="vertical">
              <Radio value={PrintMode.Resize}>
                <Trans>Print a large image onto multiple pages</Trans>
              </Radio>
              <Radio value={PrintMode.Standard}>
                <Trans>Standard print</Trans>
              </Radio>
            </Space>
          </Radio.Group>

          {printMode === PrintMode.Resize && (
            <>
              <Form.Item label={t`Paper size`} className="u-mb-0">
                <Select
                  value={paperSize}
                  onChange={setPaperSize}
                  options={PAPER_SIZE_OPTIONS}
                  className={styles['paperSizeSelect']}
                />
              </Form.Item>

              <Form.Item
                label={t`Target print size`}
                className="u-mb-0"
                help={isTargetSizeError ? t`This print size is not supported` : null}
                validateStatus={isTargetSizeError ? 'error' : undefined}
              >
                <Space.Compact block>
                  <InputNumber
                    value={targetWidth}
                    onChange={setTargetWidth}
                    min={1}
                    max={1000}
                    step={0.1}
                    placeholder={t`Width`}
                    className={styles['numberInput']}
                  />
                  <Input placeholder="×" className={styles['separatorInput']} disabled />
                  <InputNumber
                    value={targetHeight}
                    onChange={setTargetHeight}
                    min={1}
                    max={1000}
                    step={0.1}
                    placeholder={t`Height`}
                    className={styles['numberInput']}
                  />
                  <Select
                    value={targetUnit}
                    onChange={setTargetUnit}
                    options={LENGTH_UNIT_OPTIONS}
                    className={styles['numberInput']}
                  />
                </Space.Compact>
              </Form.Item>

              <Form.Item
                label={t`Margin`}
                tooltip={t`Taped margin width around the painting area`}
                className="u-mb-0"
                help={isMarginError ? t`The margin is too large` : null}
                validateStatus={isMarginError ? 'error' : undefined}
              >
                <Space.Compact block>
                  <InputNumber
                    value={margin}
                    onChange={value => {
                      setMargin(value ?? 0);
                    }}
                    min={0}
                    max={10}
                    step={0.1}
                    placeholder={t`Margin`}
                    className={styles['numberInput']}
                  />
                  <Input
                    placeholder={LENGTH_UNITS.get(targetUnit)?.abbreviation}
                    className={styles['unitInput']}
                    disabled
                  />
                </Space.Compact>
              </Form.Item>

              {previewImageUrl && (
                <img
                  src={previewImageUrl}
                  alt={t`Print preview`}
                  className={styles['previewImage']}
                />
              )}
            </>
          )}
        </Space>
      </LoadingIndicator>
    </Drawer>
  );
}
