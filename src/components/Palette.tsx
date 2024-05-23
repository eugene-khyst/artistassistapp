/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import type {CollapseProps} from 'antd';
import {Collapse, Spin, Typography} from 'antd';
import {useCallback, useEffect, useState} from 'react';

import type {ColorMixture, ColorType} from '~/src/services/color';
import {COLOR_TYPES, colorMixtureToUrl} from '~/src/services/color';
import {useAppStore} from '~/src/stores/app-store';

import {ColorSwatchDrawer} from './drawer/ColorSwatchDrawer';
import {EmptyPalette} from './empty/EmptyPalette';
import {PaletteGrid} from './grid/PaletteGrid';
import {ShareModal} from './modal/ShareModal';

export const Palette: React.FC = () => {
  const colorSet = useAppStore(state => state.colorSet);
  const paletteColorMixtures = useAppStore(state => state.paletteColorMixtures);
  const isPaletteColorMixturesLoading = useAppStore(state => state.isPaletteColorMixturesLoading);

  const [activePaletteKey, setActivePaletteKey] = useState<string | string[]>(
    [...COLOR_TYPES.keys()].map((colorType: ColorType) => colorType.toString())
  );
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [shareColorMixtureUrl, setShareColorMixtureUrl] = useState<string>();

  const [colorSwatchColorMixtures, setColorSwatchColorMixtures] = useState<
    ColorMixture[] | undefined
  >();
  const [isOpenColorSwatch, setIsOpenColorSwatch] = useState<boolean>(false);

  useEffect(() => {
    if (colorSet) {
      setActivePaletteKey(colorSet.type.toString());
    }
  }, [colorSet]);

  const showShareModal = useCallback((colorMixture: ColorMixture) => {
    setShareColorMixtureUrl(colorMixtureToUrl(colorMixture));
    setIsShareModalOpen(true);
  }, []);

  const showColorSwatch = useCallback((colorMixtures: ColorMixture[]) => {
    setColorSwatchColorMixtures(colorMixtures);
    setIsOpenColorSwatch(true);
  }, []);

  const items: CollapseProps['items'] = [...COLOR_TYPES.entries()].flatMap(
    ([colorType, {name}]) => {
      const colorMixturesByType: ColorMixture[] | undefined = paletteColorMixtures?.filter(
        ({type}: ColorMixture) => type === colorType
      );
      return !colorMixturesByType?.length
        ? []
        : [
            {
              key: colorType.toString(),
              label: <Typography.Text strong>{name} palette</Typography.Text>,
              children: (
                <PaletteGrid
                  colorType={colorType}
                  colorMixtures={colorMixturesByType}
                  showShareModal={showShareModal}
                  showColorSwatch={showColorSwatch}
                />
              ),
            },
          ];
    }
  );

  const handleActiveKeyChange = (keys: string | string[]) => {
    setActivePaletteKey(keys);
  };

  return (
    <>
      <Spin spinning={isPaletteColorMixturesLoading} tip="Loading" size="large">
        <div style={{padding: '0 16px 16px'}}>
          {!paletteColorMixtures?.length ? (
            <EmptyPalette />
          ) : (
            <Collapse
              size="large"
              bordered={false}
              onChange={handleActiveKeyChange}
              items={items}
              activeKey={activePaletteKey}
            />
          )}
        </div>
      </Spin>
      <ShareModal
        title="Share your color mixture"
        open={isShareModalOpen}
        setOpen={setIsShareModalOpen}
        url={shareColorMixtureUrl}
      />
      <ColorSwatchDrawer
        colorMixtures={colorSwatchColorMixtures}
        open={isOpenColorSwatch}
        onClose={() => setIsOpenColorSwatch(false)}
      />
    </>
  );
};
