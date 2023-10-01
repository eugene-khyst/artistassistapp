/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Collapse, CollapseProps, Empty, Typography} from 'antd';
import {Dispatch, SetStateAction, useCallback, useEffect} from 'react';
import {PAINT_TYPES, PAINT_TYPE_LABELS, PaintMix, PaintType} from '../services/color';
import {RgbTuple} from '../services/color/model';
import {
  deletePaintMix as deletePaintMixFromDb,
  getPaintMixes,
  savePaintMix as savePaintMixInDb,
} from '../services/db';
import {PaletteGrid} from './PaletteGrid';

type Props = {
  paintMixes?: PaintMix[];
  setPaintMixes: Dispatch<SetStateAction<PaintMix[] | undefined>>;
  setAsBackground: (background: string | RgbTuple) => void;
  showReflectanceChart: (paintMix: PaintMix) => void;
};

export const Palette: React.FC<Props> = ({
  paintMixes,
  setPaintMixes,
  setAsBackground,
  showReflectanceChart,
}: Props) => {
  useEffect(() => {
    (async () => {
      setPaintMixes(await getPaintMixes());
    })();
  }, [setPaintMixes]);

  const savePaintMix = useCallback(
    (paintMix: PaintMix) => {
      setPaintMixes((prev: PaintMix[] | undefined) =>
        prev ? prev.map((pm: PaintMix) => (pm.id === paintMix.id ? paintMix : pm)) : []
      );
      savePaintMixInDb(paintMix);
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
                  setAsBackground,
                  showReflectanceChart,
                }}
              />
            ),
          },
        ];
  });

  const defaultActiveKey = items.flatMap(({key}) => (key ? [key] : []));

  return (
    <div style={{padding: '0 16px 8px'}}>
      <Typography.Title level={3} style={{marginTop: '0.5em'}}>
        Palette
      </Typography.Title>
      {!paintMixes?.length ? (
        <div style={{textAlign: 'center'}}>
          <Empty />
        </div>
      ) : (
        <Collapse size="large" bordered={false} {...{defaultActiveKey, items}} />
      )}
    </div>
  );
};
