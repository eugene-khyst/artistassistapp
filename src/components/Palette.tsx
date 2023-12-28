/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {App, Collapse, CollapseProps, Empty, Spin, Typography} from 'antd';
import {Dispatch, SetStateAction, useCallback, useEffect, useState} from 'react';
import {usePaints} from '../hooks';
import {
  PAINT_TYPES,
  PAINT_TYPE_LABELS,
  PaintBrand,
  PaintFractionDefinition,
  PaintMix,
  PaintMixDefinition,
  PaintType,
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
import {ReflectanceChartDrawer} from './drawer/ReflectanceChartDrawer';
import {ShareModal} from './modal/ShareModal';

type Props = {
  paintType?: PaintType;
  paintMixes?: PaintMix[];
  importedPaintMix?: PaintMixDefinition;
  setPaintMixes: Dispatch<SetStateAction<PaintMix[] | undefined>>;
  setAsBackground: (background: string | RgbTuple) => void;
};

export const Palette: React.FC<Props> = ({
  paintType,
  paintMixes,
  importedPaintMix,
  setPaintMixes,
  setAsBackground,
}: Props) => {
  const {message} = App.useApp();
  const [activeKey, setActiveKey] = useState<string | string[]>(
    PAINT_TYPES.map((paintType: PaintType) => paintType.toString())
  );
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [sharePaintMixUrl, setSharePaintMixUrl] = useState<string>();

  const [colorSwatchPaintMixes, setColorSwatchPaintMixes] = useState<PaintMix[] | undefined>();
  const [isOpenColorSwatch, setIsOpenColorSwatch] = useState<boolean>(false);

  const [reflectanceChartPaintMix, setReflectanceChartPaintMix] = useState<PaintMix | undefined>();
  const [isOpenReflectanceChart, setIsOpenReflectanceChart] = useState<boolean>(false);

  const importedPaintMixType: PaintType | undefined = importedPaintMix?.type;
  const importedPaintMixBrands: PaintBrand[] | undefined = importedPaintMix?.fractions?.map(
    ({brand}: PaintFractionDefinition) => brand
  );

  const {paints, isLoading, isError} = usePaints(importedPaintMixType, importedPaintMixBrands);

  if (isError) {
    message.error('Error while fetching data');
  }

  useEffect(() => {
    if (paintType) {
      setActiveKey(paintType.toString());
    }
  }, [paintType]);

  useEffect(() => {
    (async () => {
      if (importedPaintMix && paints.size) {
        const paintMix: PaintMix | null = createPaintMix(importedPaintMix, paints);
        if (paintMix && !(await isPaintMixExistInDb(paintMix.id))) {
          await savePaintMixInDb({...paintMix, dataIndex: Date.now()});
        }
      }
      setPaintMixes(await getPaintMixesFromDb());
    })();
  }, [importedPaintMix, paints.size, setPaintMixes]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const showReflectanceChart = (paintMix: PaintMix) => {
    setReflectanceChartPaintMix(paintMix);
    setIsOpenReflectanceChart(true);
  };

  const items: CollapseProps['items'] = PAINT_TYPES.flatMap((paintType: PaintType) => {
    const filteredPaintMixes: PaintMix[] | undefined = paintMixes?.filter(
      ({type}: PaintMix) => type === paintType
    );
    return !filteredPaintMixes?.length
      ? []
      : [
          {
            key: paintType,
            label: <b>{PAINT_TYPE_LABELS[paintType]}</b>,
            children: (
              <PaletteGrid
                {...{
                  paintType,
                  paintMixes: filteredPaintMixes,
                  savePaintMix,
                  deletePaintMix,
                  deleteAllPaintMixes,
                  showShareModal,
                  setAsBackground,
                  showColorSwatch,
                  showReflectanceChart,
                }}
              />
            ),
          },
        ];
  });

  const handleActiveKeyChange = (keys: string | string[]) => {
    setActiveKey(keys);
  };

  return (
    <>
      <div style={{padding: '0 16px 8px'}}>
        <Typography.Title level={3} style={{marginTop: '0.5em'}}>
          Palette
        </Typography.Title>
        <Spin spinning={isLoading} tip="Loading" size="large" delay={300}>
          {!paintMixes?.length ? (
            <div style={{textAlign: 'center'}}>
              <Empty />
            </div>
          ) : (
            <Collapse
              size="large"
              bordered={false}
              onChange={handleActiveKeyChange}
              {...{items, activeKey}}
            />
          )}
        </Spin>
      </div>
      <ShareModal
        title="Share your paint mix"
        open={isShareModalOpen}
        setOpen={setIsShareModalOpen}
        url={sharePaintMixUrl}
      />
      <ColorSwatchDrawer
        paintMixes={colorSwatchPaintMixes}
        open={isOpenColorSwatch}
        onClose={() => setIsOpenColorSwatch(false)}
      />
      <ReflectanceChartDrawer
        paintMix={reflectanceChartPaintMix}
        open={isOpenReflectanceChart}
        onClose={() => setIsOpenReflectanceChart(false)}
      />
    </>
  );
};
