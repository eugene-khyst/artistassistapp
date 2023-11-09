/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Rgb, RgbTuple} from './model';

export enum PaintType {
  Watercolor = 1,
  OilPaint = 2,
  AcrylicPaint = 3,
}

export const PAINT_TYPES = [PaintType.Watercolor, PaintType.OilPaint, PaintType.AcrylicPaint];

export enum PaintBrand {
  Rembrandt = 1,
  VanGogh = 2,
  DanielSmithExtraFine = 3,
  DanielSmithPrimaTek = 14,
  SchminckeHoradam = 4,
  SchminckeMussini = 5,
  SchminckeNormaProfessional = 6,
  SchminckePrimacryl = 13,
  WinsorNewtonProfessional = 7,
  Sennelier = 8,
  OldHolland = 9,
  RosaGallery = 10,
  GansaiTambi = 11,
}

export const PAINT_BRANDS: Record<PaintType, PaintBrand[]> = {
  [PaintType.Watercolor]: [
    PaintBrand.Rembrandt,
    PaintBrand.VanGogh,
    PaintBrand.DanielSmithExtraFine,
    PaintBrand.DanielSmithPrimaTek,
    PaintBrand.WinsorNewtonProfessional,
    PaintBrand.SchminckeHoradam,
    PaintBrand.Sennelier,
    PaintBrand.OldHolland,
    PaintBrand.GansaiTambi,
    PaintBrand.RosaGallery,
  ],
  [PaintType.OilPaint]: [
    PaintBrand.SchminckeMussini,
    PaintBrand.SchminckeNormaProfessional,
    PaintBrand.OldHolland,
  ],
  [PaintType.AcrylicPaint]: [
    PaintBrand.WinsorNewtonProfessional,
    PaintBrand.SchminckePrimacryl,
    PaintBrand.OldHolland,
  ],
};

export enum PaintOpacity {
  Transparent = 1,
  SemiTransparent = 2,
  SemiOpaque = 3,
  Opaque = 4,
}

export type PaintRecord = [id: number, name: string, hex: string, rho: number[], opacity: number];

export interface Paint {
  type: PaintType;
  brand: PaintBrand;
  id: number;
  name: string;
  rgb: RgbTuple;
  rho: number[];
  opacity: PaintOpacity;
}

export interface StoreBoughtPaintSet {
  name: string;
  colors: number[];
}

export interface PaintSetDefinition {
  type?: PaintType;
  brands: PaintBrand[];
  storeBoughtPaintSet?: [0] | [PaintBrand, string];
  colors: Partial<Record<PaintBrand, number[]>>;
  timestamp?: number;
}

export interface PaintSet {
  type: PaintType;
  colors: Paint[];
}

export interface Label {
  fullText: string;
  shortText?: string;
}

export const PAINT_TYPE_LABELS: Record<PaintType, string> = {
  [PaintType.Watercolor]: 'Watercolor',
  [PaintType.OilPaint]: 'Oil paint',
  [PaintType.AcrylicPaint]: 'Acrylic paint',
};

export const PAINT_BRAND_LABELS: Record<PaintType, Partial<Record<PaintBrand, Label>>> = {
  [PaintType.Watercolor]: {
    [PaintBrand.RosaGallery]: {fullText: 'Rosa Gallery Watercolours', shortText: 'Rosa Gallery'},
    [PaintBrand.Rembrandt]: {
      fullText: 'Rembrandt Royal Talens Watercolour',
      shortText: 'Rembrandt',
    },
    [PaintBrand.VanGogh]: {
      fullText: 'Van Gogh Royal Talens Watercolour',
      shortText: 'Van Gogh',
    },
    [PaintBrand.DanielSmithExtraFine]: {
      fullText: 'Daniel Smith Extra Fine Watercolors',
      shortText: 'Daniel Smith',
    },
    [PaintBrand.DanielSmithPrimaTek]: {
      fullText: 'Daniel Smith PrimaTek Watercolors',
      shortText: 'Daniel Smith PrimaTek',
    },
    [PaintBrand.SchminckeHoradam]: {
      fullText: 'Schmincke Horadam Aquarell',
      shortText: 'Horadam',
    },
    [PaintBrand.WinsorNewtonProfessional]: {
      fullText: 'Winsor & Newton Professional Watercolour',
      shortText: 'Winsor & Newton Professional',
    },
    [PaintBrand.Sennelier]: {fullText: "Sennelier l'Aquarelle", shortText: 'Sennelier'},
    [PaintBrand.OldHolland]: {
      fullText: 'Old Holland Classic Watercolours',
      shortText: 'Old Holland',
    },
    [PaintBrand.GansaiTambi]: {fullText: 'Kuretake Gansai Tambi', shortText: 'Gansai Tambi'},
  },
  [PaintType.OilPaint]: {
    [PaintBrand.SchminckeMussini]: {
      fullText: 'Schmincke Mussini Oil Colours',
      shortText: 'Mussini',
    },
    [PaintBrand.SchminckeNormaProfessional]: {
      fullText: 'Schmincke Norma Professional Oil Colours',
      shortText: 'Norma Professional',
    },
    [PaintBrand.OldHolland]: {
      fullText: 'Old Holland Classic Oil Colours',
      shortText: 'Old Holland',
    },
  },
  [PaintType.AcrylicPaint]: {
    [PaintBrand.SchminckePrimacryl]: {
      fullText: 'Schmincke PRIMAcryl',
      shortText: 'PRIMAcryl',
    },
    [PaintBrand.WinsorNewtonProfessional]: {
      fullText: 'Winsor & Newton Professional Acrylic',
      shortText: 'Winsor & Newton Professional',
    },
    [PaintBrand.OldHolland]: {
      fullText: 'Old Holland New Masters Classic Acrylics',
      shortText: 'Old Holland',
    },
  },
};

const PAINTS: Record<PaintType, Partial<Record<PaintBrand, [paints: URL, paintSets: URL]>>> = {
  [PaintType.Watercolor]: {
    [PaintBrand.RosaGallery]: [
      new URL('../../data/watercolor/rosa-gallery/colors.json', import.meta.url),
      new URL('../../data/watercolor/rosa-gallery/sets.json', import.meta.url),
    ],
    [PaintBrand.Rembrandt]: [
      new URL('../../data/watercolor/rembrandt/colors.json', import.meta.url),
      new URL('../../data/watercolor/rembrandt/sets.json', import.meta.url),
    ],
    [PaintBrand.VanGogh]: [
      new URL('../../data/watercolor/van-gogh/colors.json', import.meta.url),
      new URL('../../data/watercolor/van-gogh/sets.json', import.meta.url),
    ],
    [PaintBrand.DanielSmithExtraFine]: [
      new URL('../../data/watercolor/daniel-smith-extra-fine/colors.json', import.meta.url),
      new URL('../../data/watercolor/daniel-smith-extra-fine/sets.json', import.meta.url),
    ],
    [PaintBrand.DanielSmithPrimaTek]: [
      new URL('../../data/watercolor/daniel-smith-primatek/colors.json', import.meta.url),
      new URL('../../data/watercolor/daniel-smith-primatek/sets.json', import.meta.url),
    ],
    [PaintBrand.SchminckeHoradam]: [
      new URL('../../data/watercolor/horadam/colors.json', import.meta.url),
      new URL('../../data/watercolor/horadam/sets.json', import.meta.url),
    ],
    [PaintBrand.WinsorNewtonProfessional]: [
      new URL('../../data/watercolor/winsor-newton/colors.json', import.meta.url),
      new URL('../../data/watercolor/winsor-newton/sets.json', import.meta.url),
    ],
    [PaintBrand.Sennelier]: [
      new URL('../../data/watercolor/sennelier/colors.json', import.meta.url),
      new URL('../../data/watercolor/sennelier/sets.json', import.meta.url),
    ],
    [PaintBrand.OldHolland]: [
      new URL('../../data/watercolor/old-holland/colors.json', import.meta.url),
      new URL('../../data/watercolor/old-holland/sets.json', import.meta.url),
    ],
    [PaintBrand.GansaiTambi]: [
      new URL('../../data/watercolor/gansai-tambi/colors.json', import.meta.url),
      new URL('../../data/watercolor/gansai-tambi/sets.json', import.meta.url),
    ],
  },
  [PaintType.OilPaint]: {
    [PaintBrand.SchminckeMussini]: [
      new URL('../../data/oil-paint/mussini/colors.json', import.meta.url),
      new URL('../../data/oil-paint/mussini/sets.json', import.meta.url),
    ],
    [PaintBrand.SchminckeNormaProfessional]: [
      new URL('../../data/oil-paint/norma-professional/colors.json', import.meta.url),
      new URL('../../data/oil-paint/norma-professional/sets.json', import.meta.url),
    ],
    [PaintBrand.OldHolland]: [
      new URL('../../data/oil-paint/old-holland/colors.json', import.meta.url),
      new URL('../../data/oil-paint/old-holland/sets.json', import.meta.url),
    ],
  },
  [PaintType.AcrylicPaint]: {
    [PaintBrand.SchminckePrimacryl]: [
      new URL('../../data/acrylic-paint/primacryl/colors.json', import.meta.url),
      new URL('../../data/acrylic-paint/primacryl/sets.json', import.meta.url),
    ],
    [PaintBrand.WinsorNewtonProfessional]: [
      new URL('../../data/acrylic-paint/winsor-newton/colors.json', import.meta.url),
      new URL('../../data/acrylic-paint/winsor-newton/sets.json', import.meta.url),
    ],
    [PaintBrand.OldHolland]: [
      new URL('../../data/acrylic-paint/old-holland/colors.json', import.meta.url),
      new URL('../../data/acrylic-paint/old-holland/sets.json', import.meta.url),
    ],
  },
};

export async function fetchPaints(type: PaintType, brand: PaintBrand): Promise<Map<number, Paint>> {
  const url = PAINTS[type][brand]?.[0];
  if (!url) {
    throw new Error(`Unknown paint brand ${brand} for type ${type}`);
  }
  const response = await fetch(url);
  const paints: PaintRecord[] = await response.json();
  return new Map(
    paints
      .map(
        (paint: PaintRecord): Paint => ({
          type,
          brand,
          id: paint[0],
          name: paint[1],
          rgb: Rgb.fromHex(paint[2]).toRgbTuple(),
          rho: paint[3],
          opacity: paint[4],
        })
      )
      .map((paint: Paint) => [paint.id, paint])
  );
}

export async function fetchStoreBoughtPaintSets(
  type: PaintType,
  brand: PaintBrand
): Promise<Map<string, StoreBoughtPaintSet>> {
  const url = PAINTS[type][brand]?.[1];
  if (!url) {
    throw new Error(`Unknown paint brand ${brand} for type ${type}`);
  }
  const response = await fetch(url);
  const storeBoughtPaintSets: StoreBoughtPaintSet[] = await response.json();
  return new Map(
    storeBoughtPaintSets.map((storeBoughtPaintSet: StoreBoughtPaintSet) => [
      storeBoughtPaintSet.name,
      storeBoughtPaintSet,
    ])
  );
}

export function toPaintSet(
  values: PaintSetDefinition,
  paints: Map<PaintBrand, Map<number, Paint>>
): PaintSet {
  if (!values.type || !Object.entries(values.colors).length) {
    throw new Error('Paint type or colors are missing');
  }
  return {
    type: values.type,
    colors: Object.entries(values.colors).flatMap(
      ([brand, selectedColors]: [string, number[]]): Paint[] =>
        selectedColors.flatMap((selectedColor: number): Paint[] => {
          const paint: Paint | undefined = paints
            ?.get(Number(brand) as PaintBrand)
            ?.get(selectedColor);
          return !paint ? [] : [paint];
        })
    ),
  };
}
