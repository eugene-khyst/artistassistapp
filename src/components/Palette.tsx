/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {App, Collapse, CollapseProps, Spin, Typography} from 'antd';
import {Dispatch, SetStateAction, useCallback, useEffect, useRef, useState} from 'react';
import {usePaints} from '../hooks';
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
} from '../services/color';
import {RgbTuple} from '../services/color/model';
import {
  deletePaintMix as deletePaintMixFromDb,
  getPaintMixes as getPaintMixesFromDb,
  isPaintMixExist as isPaintMixExistInDb,
  savePaintMix as savePaintMixInDb,
} from '../services/db';
import {PaletteGrid} from './PaletteGrid';
import {ColorSwatchDrawer} from './drawer/ColorSwatchDrawer';
import {ShareModal} from './modal/ShareModal';

type Props = {
  paintSet?: PaintSet;
  imageFileId?: number;
  paintMixes?: PaintMix[];
  importedPaintMix?: PaintMixDefinition;
  setPaintMixes: Dispatch<SetStateAction<PaintMix[] | undefined>>;
  setColorPicker: (pipet?: Pipet) => void;
  setAsBackground: (background: string | RgbTuple) => void;
  blob?: Blob;
};

export const Palette: React.FC<Props> = ({
  paintSet,
  imageFileId,
  paintMixes,
  importedPaintMix,
  setPaintMixes,
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
  }, [importedPaintMix, paints.size, setPaintMixes, imageFileId]); // eslint-disable-line react-hooks/exhaustive-deps

  const savePaintMix = useCallback(
    async (paintMix: PaintMix) => {
      setPaintMixes((prev: PaintMix[] | undefined) =>
        prev ? prev.map((pm: PaintMix) => (pm.id === paintMix.id ? paintMix : pm)) : []
      );
      await savePaintMixInDb(paintMix);
    },
    [setPaintMixes]
  );

  const deletePaintMix = useCallback(
    (paintMixId: string) => {
      setPaintMixes((prev: PaintMix[] | undefined) =>
        prev ? prev.filter(({id}: PaintMix) => id !== paintMixId) : []
      );
      deletePaintMixFromDb(paintMixId);
    },
    [setPaintMixes]
  );

  const deleteAllPaintMixes = useCallback(
    (paintType: PaintType) => {
      setPaintMixes((prev: PaintMix[] | undefined) =>
        prev ? prev.filter(({type}: PaintMix) => type !== paintType) : []
      );
      paintMixes
        ?.filter(({type}: PaintMix) => type === paintType)
        ?.forEach(({id}: PaintMix) => deletePaintMixFromDb(id));
    },
    [setPaintMixes, paintMixes]
  );

  const showShareModal = useCallback((paintMix: PaintMix) => {
    setSharePaintMixUrl(paintMixToUrl(paintMix));
    setIsShareModalOpen(true);
  }, []);

  const showColorSwatch = (paintMixes: PaintMix[]) => {
    setColorSwatchPaintMixes(paintMixes);
    setIsOpenColorSwatch(true);
  };

  const items: CollapseProps['items'] = [...PAINT_TYPES.entries()].flatMap(([paintType, label]) => {
    const filteredPaintMixes: PaintMix[] | undefined = paintMixes?.filter(
      ({type}: PaintMix) => type === paintType
    );
    return !filteredPaintMixes?.length
      ? []
      : [
          {
            key: paintType.toString(),
            label: <Typography.Text strong>{label} palette</Typography.Text>,
            children: (
              <PaletteGrid
                paintType={paintType}
                paintMixes={filteredPaintMixes}
                savePaintMix={savePaintMix}
                deletePaintMix={deletePaintMix}
                deleteAllPaintMixes={deleteAllPaintMixes}
                showShareModal={showShareModal}
                setColorPicker={setColorPicker}
                setAsBackground={setAsBackground}
                showColorSwatch={showColorSwatch}
              />
            ),
          },
        ];
  });

  const handleActiveKeyChange = (keys: string | string[]) => {
    setActivePaletteKey(keys);
  };

  return (
    <>
      <Spin spinning={isLoading} tip="Loading" size="large" delay={300}>
        <div style={{padding: '0 16px 8px'}}>
          {!paintMixes?.length ? (
            <>
              <Typography.Paragraph>
                <Typography.Text strong>⁉️ No data</Typography.Text>
                <br />
                There is one common palette and a separate palette for each photo.
                <br />
                To use the palette features, add color mixtures:
                <ol>
                  <li>
                    Go to the <Typography.Text keyboard>Colors</Typography.Text> tab.
                  </li>
                  <li>Click 🖱️ or tap 👆 anywhere in the image to choose a color.</li>
                  <li>
                    Click the <Typography.Text keyboard>Add to palette</Typography.Text> button next
                    to the color mixture you like.
                  </li>
                  <li>
                    Return to the <Typography.Text keyboard>Palette</Typography.Text> tab.
                  </li>
                </ol>
              </Typography.Paragraph>
            </>
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
