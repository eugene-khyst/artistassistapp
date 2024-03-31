/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {App, Collapse, CollapseProps, Spin, Typography} from 'antd';
import {Dispatch, SetStateAction, useCallback, useEffect, useRef, useState} from 'react';
import {usePaints} from '~/src/hooks';
import {
  PAINT_TYPES,
  PaintBrand,
  PaintFractionDefinition,
  PaintMix,
  PaintMixDefinition,
  PaintSet,
  PaintType,
  Pipet,
  createPaintMix,
  paintMixToUrl,
} from '~/src/services/color';
import {RgbTuple} from '~/src/services/color/model';
import {
  getPaintMixes as getPaintMixesFromDb,
  isPaintMixExist as isPaintMixExistInDb,
  savePaintMix as savePaintMixInDb,
} from '~/src/services/db';
import {ColorSwatchDrawer} from './drawer/ColorSwatchDrawer';
import {EmptyPalette} from './empty/EmptyPalette';
import {PaletteGrid} from './grid/PaletteGrid';
import {ShareModal} from './modal/ShareModal';

type Props = {
  paintSet?: PaintSet;
  imageFileId?: number;
  importedPaintMix?: PaintMixDefinition;
  paintMixes?: PaintMix[];
  setPaintMixes: Dispatch<SetStateAction<PaintMix[] | undefined>>;
  savePaintMix: (paintMix: PaintMix, isNew?: boolean) => void;
  deletePaintMix: (paintMixId: string) => void;
  deletePaintMixesByType: (paintType: PaintType) => void;
  setColorPicker: (pipet?: Pipet) => void;
  setAsBackground: (background: string | RgbTuple) => void;
  blob?: Blob;
};

export const Palette: React.FC<Props> = ({
  paintSet,
  imageFileId,
  importedPaintMix,
  paintMixes,
  setPaintMixes,
  savePaintMix,
  deletePaintMix,
  deletePaintMixesByType,
  setColorPicker,
  setAsBackground,
  blob,
}: Props) => {
  const {message} = App.useApp();
  const [activePaletteKey, setActivePaletteKey] = useState<string | string[]>(
    [...PAINT_TYPES.keys()].map((paintType: PaintType) => paintType.toString())
  );
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [sharePaintMixUrl, setSharePaintMixUrl] = useState<string>();

  const [colorSwatchPaintMixes, setColorSwatchPaintMixes] = useState<PaintMix[] | undefined>();
  const [isOpenColorSwatch, setIsOpenColorSwatch] = useState<boolean>(false);

  const importDone = useRef<boolean>(false);
  const importedPaintMixType: PaintType | undefined = importedPaintMix?.type;
  const importedPaintMixBrands: PaintBrand[] | undefined = importedPaintMix?.fractions?.map(
    ({brand}: PaintFractionDefinition) => brand
  );

  const {paints, isLoading, isError} = usePaints(importedPaintMixType, importedPaintMixBrands);

  if (isError) {
    message.error('Error while fetching data');
  }

  useEffect(() => {
    if (paintSet) {
      setActivePaletteKey(paintSet.type.toString());
    }
  }, [paintSet]);

  useEffect(() => {
    (async () => {
      if (importedPaintMix && paints.size && !importDone.current) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('Importing paint mix', importedPaintMix);
        }
        const paintMix: PaintMix | null = createPaintMix(importedPaintMix, paints);
        if (paintMix && !(await isPaintMixExistInDb(paintMix.id))) {
          const paintMixToSave = {...paintMix, dataIndex: Date.now()};
          await savePaintMixInDb(paintMixToSave);
        }
        importDone.current = true;
      }
      const mixepaintMixesFromDb = await getPaintMixesFromDb(imageFileId);
      setPaintMixes(mixepaintMixesFromDb);
    })();
  }, [importedPaintMix, paints.size, setPaintMixes, imageFileId]);

  const showShareModal = useCallback((paintMix: PaintMix) => {
    setSharePaintMixUrl(paintMixToUrl(paintMix));
    setIsShareModalOpen(true);
  }, []);

  const showColorSwatch = (paintMixes: PaintMix[]) => {
    setColorSwatchPaintMixes(paintMixes);
    setIsOpenColorSwatch(true);
  };

  const items: CollapseProps['items'] = [...PAINT_TYPES.entries()].flatMap(
    ([paintType, {name}]) => {
      const filteredPaintMixes: PaintMix[] | undefined = paintMixes?.filter(
        ({type}: PaintMix) => type === paintType
      );
      return !filteredPaintMixes?.length
        ? []
        : [
            {
              key: paintType.toString(),
              label: <Typography.Text strong>{name} palette</Typography.Text>,
              children: (
                <PaletteGrid
                  paintType={paintType}
                  paintMixes={filteredPaintMixes}
                  savePaintMix={savePaintMix}
                  deletePaintMix={deletePaintMix}
                  deletePaintMixesByType={deletePaintMixesByType}
                  showShareModal={showShareModal}
                  setColorPicker={setColorPicker}
                  setAsBackground={setAsBackground}
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
      <Spin spinning={isLoading} tip="Loading" size="large">
        <div style={{padding: '0 16px 16px'}}>
          {!paintMixes?.length ? (
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
        url={sharePaintMixUrl}
      />
      <ColorSwatchDrawer
        paintMixes={colorSwatchPaintMixes}
        open={isOpenColorSwatch}
        onClose={() => setIsOpenColorSwatch(false)}
        blob={blob}
      />
    </>
  );
};
