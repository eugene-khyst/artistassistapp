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

import {PrinterOutlined} from '@ant-design/icons';
import {
  COLOR_MIXTURES_COMPARATORS,
  type ColorMixture,
  ColorMixtureSort,
  decorateSortUndecorate,
  isRgbDark,
  rgbToHex,
} from '@eugene-khyst/artistassistapp-color-mixer';
import {Trans, useLingui} from '@lingui/react/macro';
import {Button, Col, Drawer, Grid, Row} from 'antd';
import {useRef} from 'react';
import {useReactToPrint} from 'react-to-print';

import {useCreateObjectUrl} from '@/hooks/useCreateObjectUrl';
import {useAppStore} from '@/stores/app-store';
import type {CssVariables} from '@/utils/types';

import styles from './ColorSwatchDrawer.module.css';

interface Props {
  colorMixtures?: ColorMixture[];
  open?: boolean;
  onClose?: () => void;
}

export function ColorSwatchDrawer({colorMixtures, open = false, onClose}: Readonly<Props>) {
  const selectedImageFile = useAppStore(state => state.selectedImageFile);

  const screens = Grid.useBreakpoint();

  const {t} = useLingui();

  const imageBlob: Blob | undefined = selectedImageFile?.blob;
  const imageUrl: string | undefined = useCreateObjectUrl(imageBlob);

  const printRef = useRef<HTMLDivElement>(null);

  const isFullHeight: boolean = screens.sm || !imageUrl;

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'ArtistAssistApp',
  });

  const divider: number = isFullHeight ? 1 : 2;
  const imageHeight = imageUrl ? `calc((100dvh - 60px) / ${divider})` : 0;
  const colorSwatchHeight = `calc((100dvh - 60px) / ${divider})`;
  const imageColumnStyle: CssVariables = {'--image-height': imageHeight};
  const swatchColumnStyle: CssVariables = {'--swatch-height': colorSwatchHeight};

  return (
    <Drawer
      title={
        <Button
          type="primary"
          icon={<PrinterOutlined />}
          onClick={() => {
            handlePrint();
          }}
        >
          <Trans>Print</Trans>
        </Button>
      }
      placement="right"
      size="100%"
      open={open}
      onClose={onClose}
      classNames={{body: styles['body']}}
    >
      <Row ref={printRef}>
        {imageUrl && (
          <Col xs={24} sm={12} className={styles['imageColumn']} style={imageColumnStyle}>
            <img alt={t`Reference`} src={imageUrl} className={styles['image']} />
          </Col>
        )}
        <Col
          xs={24}
          sm={imageUrl ? 12 : 24}
          className={styles['swatchColumn']}
          style={swatchColumnStyle}
        >
          {decorateSortUndecorate(
            colorMixtures,
            COLOR_MIXTURES_COMPARATORS[ColorMixtureSort.ByHue]
          )?.map((colorMixture: ColorMixture) => {
            const {layerRgb} = colorMixture;
            const stripeStyle: CssVariables = {
              '--stripe-bg': rgbToHex(...layerRgb),
              '--stripe-color': isRgbDark(...layerRgb) ? '#fff' : '#000',
            };
            return (
              <div key={colorMixture.key} className={styles['stripe']} style={stripeStyle}>
                {colorMixture.name || <Trans>Untitled mixture</Trans>}
              </div>
            );
          })}
        </Col>
      </Row>
    </Drawer>
  );
}
