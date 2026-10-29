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

import {type ColorMixture, rgbToHex} from '@eugene-khyst/artistassistapp-color-mixer';
import {
  createImageBitmapAndResize,
  IMAGE_SIZE,
  ResizeImage,
} from '@eugene-khyst/artistassistapp-image-processing/utils/graphics';
import {Trans, useLingui} from '@lingui/react/macro';
import {Alert, Col, Drawer, Flex, Grid, Row, Space, Typography} from 'antd';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {FileSelect} from '@/components/file/FileSelect';
import {TakePhoto} from '@/components/file/TakePhoto';
import {useZoomableImageCanvas} from '@/hooks/useZoomableImageCanvas';
import {
  type ComparisonRegions,
  ImageComparisonMode,
} from '@/services/canvas/mode/image-comparison-mode';
import {
  getMixtureMatchScore,
  MixtureAdjustmentKind,
  recommendMixtureAdjustment,
} from '@/services/color/compare-mixture';
import {
  findMixtureRegions,
  MixturePhotoProblem,
  type MixturePhotoSamples,
  sampleMixturePhoto,
} from '@/services/image/compare-mixture';

import {ColorDescription} from './ColorDescription';
import {ColorSquare} from './ColorSquare';
import styles from './CompareMixtureDrawer.module.css';

interface Props {
  colorMixture: ColorMixture;
  onClose: () => void;
}

export function CompareMixtureDrawer({colorMixture, onClose}: Readonly<Props>) {
  const {t} = useLingui();
  const screens = Grid.useBreakpoint();
  const [photo, setPhoto] = useState<ImageBitmap | null>(null);
  const [loading, setLoading] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const [regions, setRegions] = useState<ComparisonRegions>([null, null]);
  const photoRequestRef = useRef(0);
  useEffect(
    () => () => {
      photoRequestRef.current++;
    },
    []
  );
  useEffect(
    () => () => {
      photo?.close();
    },
    [photo]
  );

  const [targetR, targetG, targetB] = colorMixture.tintRgb;
  const modeSupplier = useCallback(
    () =>
      new ImageComparisonMode({
        onChange: setRegions,
        getInitialRegions: image => findMixtureRegions(image, [targetR, targetG, targetB]),
      }),
    [targetR, targetG, targetB]
  );
  const {ref: canvasRef} = useZoomableImageCanvas(modeSupplier, photo, photo);

  const selectPhoto = async (files: File[]): Promise<void> => {
    const file = files[0];
    if (!file) {
      return;
    }
    const request = ++photoRequestRef.current;
    setLoading(true);
    setPhotoError(false);
    try {
      const image = await createImageBitmapAndResize(
        file,
        ResizeImage.resizeToPixelCount(IMAGE_SIZE['2K'])
      );
      if (request !== photoRequestRef.current) {
        image.close();
        return;
      }
      setRegions([null, null]);
      setPhoto(image);
    } catch {
      if (request === photoRequestRef.current) {
        setPhotoError(true);
      }
    } finally {
      if (request === photoRequestRef.current) {
        setLoading(false);
      }
    }
  };

  const samples = useMemo<MixturePhotoSamples>(
    () =>
      photo
        ? sampleMixturePhoto(photo, regions)
        : {reference: null, mixture: null, problem: MixturePhotoProblem.MissingRegions},
    [photo, regions]
  );
  const adjustment = useMemo(
    () => (samples.mixture ? recommendMixtureAdjustment(colorMixture, samples.mixture) : null),
    [colorMixture, samples.mixture]
  );

  const matchScoreText = samples.mixture
    ? getMixtureMatchScore(colorMixture, samples.mixture).toFixed(1)
    : null;
  const sampleMessage =
    samples.problem === MixturePhotoProblem.InvalidReference ? (
      <Trans>Move the white point to the white paper or canvas, away from shadows and glare</Trans>
    ) : samples.problem === MixturePhotoProblem.OverlappingRegions ? (
      <Trans>Move the squares so they do not overlap</Trans>
    ) : null;

  const targetColor = (
    <Space>
      <ColorSquare hex={rgbToHex(...colorMixture.tintRgb)} size="large" />
      <Typography.Text>
        <Trans>Target color</Trans>
      </Typography.Text>
    </Space>
  );

  return (
    <Drawer
      title={<Trans>Compare your mix</Trans>}
      open
      placement="right"
      size={screens.sm ? 'large' : '100%'}
      onClose={onClose}
    >
      <Flex vertical gap="middle">
        {!photo && (
          <Flex vertical gap="small">
            <Typography.Text>
              <Trans>
                Paint a swatch of your mix at full strength on white paper or canvas. For a wash or
                thin layer, test the mix before you thin it.
              </Trans>
            </Typography.Text>
            <Typography.Text>
              <Trans>
                If your paint changes color as it dries, wait until the swatch is dry. Take the
                photo in even light, with some of the white paper or canvas showing and no shadows
                or glare.
              </Trans>
            </Typography.Text>
          </Flex>
        )}
        <Flex gap="small">
          <TakePhoto onChange={selectPhoto} loading={loading} />
          <FileSelect type="default" onChange={selectPhoto} loading={loading}>
            <Trans>Select photo</Trans>
          </FileSelect>
        </Flex>
        {photoError && (
          <Alert
            type="error"
            showIcon
            title={<Trans>Could not open this photo. Choose another one.</Trans>}
          />
        )}
        {photo ? (
          <Row gutter={[24, 16]}>
            <Col xs={24} md={12}>
              <Flex vertical gap="small">
                <div className={styles['canvasContainer']}>
                  <canvas
                    ref={canvasRef}
                    className={styles['canvas']}
                    aria-label={t`Photo with squares on the white point and your mix`}
                  />
                </div>
                <Typography.Text>
                  <Trans>
                    Check that one square, the white point, is on the white paper or canvas and the
                    other is on your mix. Drag a square to move it.
                  </Trans>
                </Typography.Text>
                {sampleMessage && <Typography.Text type="warning">{sampleMessage}</Typography.Text>}
              </Flex>
            </Col>
            <Col xs={24} md={12}>
              <Flex vertical gap="middle">
                <Flex vertical gap="small">
                  {targetColor}
                  <Space>
                    <ColorSquare
                      hex={samples.mixture ? rgbToHex(...samples.mixture) : null}
                      size="large"
                    />
                    <Flex vertical>
                      <Typography.Text>
                        <Trans>Your mix</Trans>
                      </Typography.Text>
                      {matchScoreText !== null && (
                        <Typography.Text>
                          <Trans>
                            <Typography.Text strong>{matchScoreText}%</Typography.Text> match
                          </Trans>
                        </Typography.Text>
                      )}
                    </Flex>
                  </Space>
                  <Space>
                    <ColorSquare
                      hex={samples.reference ? rgbToHex(...samples.reference) : null}
                      size="large"
                    />
                    <Typography.Text>
                      <Trans>White point</Trans>
                    </Typography.Text>
                  </Space>
                </Flex>
                {!loading && adjustment && (
                  <Flex vertical gap="small" role="status" aria-live="polite">
                    {adjustment.kind === MixtureAdjustmentKind.AddPaint ? (
                      <>
                        <Typography.Text strong>
                          <Trans>Add a little more:</Trans>
                        </Typography.Text>
                        {adjustment.colors.map(color => (
                          <ColorDescription
                            key={`${color.brand}-${color.id}`}
                            colorType={colorMixture.type}
                            color={color}
                          />
                        ))}
                        <Typography.Text>
                          <Trans>Mix well and take a new photo</Trans>
                        </Typography.Text>
                      </>
                    ) : (
                      <Typography.Text strong>
                        {adjustment.kind === MixtureAdjustmentKind.WithinTargetTolerance ? (
                          <Trans>Your mix is close to the target</Trans>
                        ) : (
                          <Trans>No better match found. Check the swatch and lighting.</Trans>
                        )}
                      </Typography.Text>
                    )}
                  </Flex>
                )}
              </Flex>
            </Col>
          </Row>
        ) : (
          targetColor
        )}
      </Flex>
    </Drawer>
  );
}
