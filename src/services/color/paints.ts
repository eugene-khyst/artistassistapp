/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Rgb, RgbTuple} from './model';

export enum PaintType {
  WatercolorPaint = 1,
  OilPaint = 2,
  AcrylicPaint = 3,
  ColoredPencils = 4,
  WatercolorPencils = 5,
}

export const PAINT_TYPES = [PaintType.WatercolorPaint, PaintType.OilPaint, PaintType.AcrylicPaint];

export enum PaintBrand {
  Rembrandt = 1,
  VanGogh = 2,
  DanielSmithExtraFine = 3,
  SchminckeHoradam = 4,
  SchminckeMussini = 5,
  SchminckeNormaProfessional = 6,
  WinsorNewtonProfessional = 7,
  Sennelier = 8,
  OldHolland = 9,
  RosaGallery = 10,
  GansaiTambi = 11,
  Holbein = 12,
  SchminckePrimacryl = 13,
  DanielSmithPrimaTek = 14,
  MGraham = 15,
  DaVinci = 16,
  ShinhanPwc = 17,
  DerwentChromaflow = 18,
  DerwentColoursoft = 19,
  DerwentDrawing = 20,
  DerwentLightfast = 21,
  DerwentProcolour = 22,
  DerwentInktense = 23,
  DerwentWatercolour = 24,
  FaberCastellGoldfaber = 25,
  FaberCastellPolychromos = 26,
  CaranDAcheLuminance = 27,
  CaranDAcheMuseumAquarelle = 28,
  KohINoorPolycolor = 29,
  PrismacolorPremierSoftCore = 30,
  MichaelHarding = 31,
  VallejoAcrylicStudio = 32,
  LascauxArtist = 33,
  MaimeriBlu = 34,
  MijelloMissionGold = 35,
  WhiteNights = 36,
}

export const PAINT_BRANDS: Record<PaintType, PaintBrand[]> = {
  [PaintType.WatercolorPaint]: [
    PaintBrand.DanielSmithExtraFine,
    PaintBrand.DanielSmithPrimaTek,
    PaintBrand.DaVinci,
    PaintBrand.GansaiTambi,
    PaintBrand.Holbein,
    PaintBrand.MaimeriBlu,
    PaintBrand.MGraham,
    PaintBrand.MijelloMissionGold,
    PaintBrand.OldHolland,
    PaintBrand.Rembrandt,
    PaintBrand.RosaGallery,
    PaintBrand.SchminckeHoradam,
    PaintBrand.Sennelier,
    PaintBrand.ShinhanPwc,
    PaintBrand.VanGogh,
    PaintBrand.WhiteNights,
    PaintBrand.WinsorNewtonProfessional,
  ],
  [PaintType.OilPaint]: [
    PaintBrand.MichaelHarding,
    PaintBrand.OldHolland,
    PaintBrand.SchminckeMussini,
    PaintBrand.SchminckeNormaProfessional,
  ],
  [PaintType.AcrylicPaint]: [
    PaintBrand.LascauxArtist,
    PaintBrand.OldHolland,
    PaintBrand.SchminckePrimacryl,
    PaintBrand.VallejoAcrylicStudio,
    PaintBrand.WinsorNewtonProfessional,
  ],
  [PaintType.ColoredPencils]: [
    PaintBrand.CaranDAcheLuminance,
    PaintBrand.DerwentChromaflow,
    PaintBrand.DerwentColoursoft,
    PaintBrand.DerwentDrawing,
    PaintBrand.DerwentLightfast,
    PaintBrand.DerwentProcolour,
    PaintBrand.FaberCastellGoldfaber,
    PaintBrand.FaberCastellPolychromos,
    PaintBrand.Holbein,
    PaintBrand.KohINoorPolycolor,
    PaintBrand.PrismacolorPremierSoftCore,
    PaintBrand.VanGogh,
  ],
  [PaintType.WatercolorPencils]: [
    PaintBrand.CaranDAcheMuseumAquarelle,
    PaintBrand.DerwentInktense,
    PaintBrand.DerwentWatercolour,
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

interface PaintIdFormat {
  padWithLeadingZeros?: boolean;
  padLength?: number;
  prefix?: string;
  formatter?: (id: string) => string;
}

export const PAINT_TYPE_LABELS: Record<PaintType, string> = {
  [PaintType.WatercolorPaint]: 'Watercolor paint',
  [PaintType.OilPaint]: 'Oil paint',
  [PaintType.AcrylicPaint]: 'Acrylic paint',
  [PaintType.ColoredPencils]: 'Colored pencils',
  [PaintType.WatercolorPencils]: 'Watercolor pencils',
};

export const PAINT_BRAND_LABELS: Record<PaintType, Partial<Record<PaintBrand, Label>>> = {
  [PaintType.WatercolorPaint]: {
    [PaintBrand.RosaGallery]: {fullText: 'Rosa Gallery Watercolours', shortText: 'Rosa Gallery'},
    [PaintBrand.Rembrandt]: {
      fullText: 'Rembrandt Watercolour',
      shortText: 'Rembrandt',
    },
    [PaintBrand.VanGogh]: {
      fullText: 'Van Gogh Watercolour',
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
    [PaintBrand.Holbein]: {
      fullText: "Holbein Artists' Watercolor (HWC)",
      shortText: 'Holbein',
    },
    [PaintBrand.MGraham]: {
      fullText: "M. Graham & Co. Artists' Watercolor",
      shortText: 'M. Graham',
    },
    [PaintBrand.DaVinci]: {
      fullText: 'Da Vinci Artist Watercolor Paints',
      shortText: 'Da Vinci',
    },
    [PaintBrand.ShinhanPwc]: {
      fullText: 'ShinHan PWC, Extra Fine Watercolor',
      shortText: 'ShinHan PWC',
    },
    [PaintBrand.MaimeriBlu]: {
      fullText: 'Maimeri Blu',
    },
    [PaintBrand.MijelloMissionGold]: {
      fullText: 'Mijello Mission Gold Class Watercolor',
      shortText: 'Mijello Mission Gold',
    },
    [PaintBrand.WhiteNights]: {
      fullText: "White Nights Extra Fine Artists' Watercolours",
      shortText: 'White Nights',
    },
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
    [PaintBrand.MichaelHarding]: {
      fullText: 'Michael Harding',
      shortText: 'Michael Harding Oil Colours',
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
    [PaintBrand.VallejoAcrylicStudio]: {
      fullText: 'Vallejo Acrylic Studio',
    },
    [PaintBrand.LascauxArtist]: {
      fullText: 'Lascaux Artist',
    },
  },
  [PaintType.ColoredPencils]: {
    [PaintBrand.KohINoorPolycolor]: {
      fullText: 'Koh-I-Noor Polycolor',
    },
    [PaintBrand.DerwentChromaflow]: {
      fullText: 'Derwent Chromaflow Pencils',
      shortText: 'Derwent Chromaflow',
    },
    [PaintBrand.DerwentColoursoft]: {
      fullText: 'Derwent Coloursoft Pencils',
      shortText: 'Derwent Coloursoft',
    },
    [PaintBrand.DerwentDrawing]: {
      fullText: 'Derwent Colour Drawing Pencils',
      shortText: 'Derwent Drawing',
    },
    [PaintBrand.DerwentLightfast]: {
      fullText: 'Derwent Lightfast Colour Pencils',
      shortText: 'Derwent Lightfast',
    },
    [PaintBrand.DerwentProcolour]: {
      fullText: 'Derwent Procolour Pencils',
      shortText: 'Derwent Procolour',
    },
    [PaintBrand.FaberCastellGoldfaber]: {
      fullText: 'Faber-Castell Goldfaber Colour Pencils',
      shortText: 'Faber-Castell Goldfaber',
    },
    [PaintBrand.FaberCastellPolychromos]: {
      fullText: 'Faber-Castell Polychromos Colour Pencils',
      shortText: 'Faber-Castell Polychromos',
    },
    [PaintBrand.CaranDAcheLuminance]: {
      fullText: "Caran d'Ache Luminance 6901",
      shortText: "Caran d'Ache Luminance",
    },
    [PaintBrand.VanGogh]: {
      fullText: 'Van Gogh Colour Pencils',
      shortText: 'Van Gogh',
    },
    [PaintBrand.Holbein]: {
      fullText: "Holbein Artists' Colored Pencils",
      shortText: 'Holbein',
    },
    [PaintBrand.PrismacolorPremierSoftCore]: {
      fullText: 'Prismacolor Premier Soft Core Colored Pencils',
      shortText: 'Prismacolor Premier Soft Core',
    },
  },
  [PaintType.WatercolorPencils]: {
    [PaintBrand.DerwentInktense]: {
      fullText: 'Derwent Inktense Pencils',
      shortText: 'Derwent Inktense',
    },
    [PaintBrand.DerwentWatercolour]: {
      fullText: 'Derwent Watercolour Pencils',
      shortText: 'Derwent Watercolour',
    },
    [PaintBrand.CaranDAcheMuseumAquarelle]: {
      fullText: "Caran d'Ache Museum Aquarelle",
      shortText: "Caran d'Ache Museum Aquarelle",
    },
  },
};

const PAINTS: Record<PaintType, Partial<Record<PaintBrand, [paints: URL, paintSets: URL]>>> = {
  [PaintType.WatercolorPaint]: {
    [PaintBrand.RosaGallery]: [
      new URL('../../data/watercolor-paint/rosa-gallery/colors.json', import.meta.url),
      new URL('../../data/watercolor-paint/rosa-gallery/sets.json', import.meta.url),
    ],
    [PaintBrand.Rembrandt]: [
      new URL('../../data/watercolor-paint/rembrandt/colors.json', import.meta.url),
      new URL('../../data/watercolor-paint/rembrandt/sets.json', import.meta.url),
    ],
    [PaintBrand.VanGogh]: [
      new URL('../../data/watercolor-paint/van-gogh/colors.json', import.meta.url),
      new URL('../../data/watercolor-paint/van-gogh/sets.json', import.meta.url),
    ],
    [PaintBrand.DanielSmithExtraFine]: [
      new URL('../../data/watercolor-paint/daniel-smith-extra-fine/colors.json', import.meta.url),
      new URL('../../data/watercolor-paint/daniel-smith-extra-fine/sets.json', import.meta.url),
    ],
    [PaintBrand.DanielSmithPrimaTek]: [
      new URL('../../data/watercolor-paint/daniel-smith-primatek/colors.json', import.meta.url),
      new URL('../../data/watercolor-paint/daniel-smith-primatek/sets.json', import.meta.url),
    ],
    [PaintBrand.SchminckeHoradam]: [
      new URL('../../data/watercolor-paint/horadam/colors.json', import.meta.url),
      new URL('../../data/watercolor-paint/horadam/sets.json', import.meta.url),
    ],
    [PaintBrand.WinsorNewtonProfessional]: [
      new URL('../../data/watercolor-paint/winsor-newton/colors.json', import.meta.url),
      new URL('../../data/watercolor-paint/winsor-newton/sets.json', import.meta.url),
    ],
    [PaintBrand.Sennelier]: [
      new URL('../../data/watercolor-paint/sennelier/colors.json', import.meta.url),
      new URL('../../data/watercolor-paint/sennelier/sets.json', import.meta.url),
    ],
    [PaintBrand.OldHolland]: [
      new URL('../../data/watercolor-paint/old-holland/colors.json', import.meta.url),
      new URL('../../data/watercolor-paint/old-holland/sets.json', import.meta.url),
    ],
    [PaintBrand.GansaiTambi]: [
      new URL('../../data/watercolor-paint/gansai-tambi/colors.json', import.meta.url),
      new URL('../../data/watercolor-paint/gansai-tambi/sets.json', import.meta.url),
    ],
    [PaintBrand.Holbein]: [
      new URL('../../data/watercolor-paint/holbein/colors.json', import.meta.url),
      new URL('../../data/watercolor-paint/holbein/sets.json', import.meta.url),
    ],
    [PaintBrand.MGraham]: [
      new URL('../../data/watercolor-paint/m-graham/colors.json', import.meta.url),
      new URL('../../data/watercolor-paint/m-graham/sets.json', import.meta.url),
    ],
    [PaintBrand.DaVinci]: [
      new URL('../../data/watercolor-paint/da-vinci/colors.json', import.meta.url),
      new URL('../../data/watercolor-paint/da-vinci/sets.json', import.meta.url),
    ],
    [PaintBrand.ShinhanPwc]: [
      new URL('../../data/watercolor-paint/shinhan-pwc/colors.json', import.meta.url),
      new URL('../../data/watercolor-paint/shinhan-pwc/sets.json', import.meta.url),
    ],
    [PaintBrand.MaimeriBlu]: [
      new URL('../../data/watercolor-paint/maimeri-blu/colors.json', import.meta.url),
      new URL('../../data/watercolor-paint/maimeri-blu/sets.json', import.meta.url),
    ],
    [PaintBrand.MijelloMissionGold]: [
      new URL('../../data/watercolor-paint/mijello-mission-gold/colors.json', import.meta.url),
      new URL('../../data/watercolor-paint/mijello-mission-gold/sets.json', import.meta.url),
    ],
    [PaintBrand.WhiteNights]: [
      new URL('../../data/watercolor-paint/white-nights/colors.json', import.meta.url),
      new URL('../../data/watercolor-paint/white-nights/sets.json', import.meta.url),
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
    [PaintBrand.MichaelHarding]: [
      new URL('../../data/oil-paint/michael-harding/colors.json', import.meta.url),
      new URL('../../data/oil-paint/michael-harding/sets.json', import.meta.url),
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
    [PaintBrand.VallejoAcrylicStudio]: [
      new URL('../../data/acrylic-paint/vallejo-acrylic-studio/colors.json', import.meta.url),
      new URL('../../data/acrylic-paint/vallejo-acrylic-studio/sets.json', import.meta.url),
    ],
    [PaintBrand.LascauxArtist]: [
      new URL('../../data/acrylic-paint/lascaux-artist/colors.json', import.meta.url),
      new URL('../../data/acrylic-paint/lascaux-artist/sets.json', import.meta.url),
    ],
  },
  [PaintType.ColoredPencils]: {
    [PaintBrand.KohINoorPolycolor]: [
      new URL('../../data/colored-pencils/koh-i-noor-polycolor/colors.json', import.meta.url),
      new URL('../../data/colored-pencils/koh-i-noor-polycolor/sets.json', import.meta.url),
    ],
    [PaintBrand.DerwentChromaflow]: [
      new URL('../../data/colored-pencils/derwent-chromaflow/colors.json', import.meta.url),
      new URL('../../data/colored-pencils/derwent-chromaflow/sets.json', import.meta.url),
    ],
    [PaintBrand.DerwentColoursoft]: [
      new URL('../../data/colored-pencils/derwent-coloursoft/colors.json', import.meta.url),
      new URL('../../data/colored-pencils/derwent-coloursoft/sets.json', import.meta.url),
    ],
    [PaintBrand.DerwentDrawing]: [
      new URL('../../data/colored-pencils/derwent-drawing/colors.json', import.meta.url),
      new URL('../../data/colored-pencils/derwent-drawing/sets.json', import.meta.url),
    ],
    [PaintBrand.DerwentLightfast]: [
      new URL('../../data/colored-pencils/derwent-lightfast/colors.json', import.meta.url),
      new URL('../../data/colored-pencils/derwent-lightfast/sets.json', import.meta.url),
    ],
    [PaintBrand.DerwentProcolour]: [
      new URL('../../data/colored-pencils/derwent-procolour/colors.json', import.meta.url),
      new URL('../../data/colored-pencils/derwent-procolour/sets.json', import.meta.url),
    ],
    [PaintBrand.FaberCastellGoldfaber]: [
      new URL('../../data/colored-pencils/faber-castell-goldfaber/colors.json', import.meta.url),
      new URL('../../data/colored-pencils/faber-castell-goldfaber/sets.json', import.meta.url),
    ],
    [PaintBrand.FaberCastellPolychromos]: [
      new URL('../../data/colored-pencils/faber-castell-polychromos/colors.json', import.meta.url),
      new URL('../../data/colored-pencils/faber-castell-polychromos/sets.json', import.meta.url),
    ],
    [PaintBrand.CaranDAcheLuminance]: [
      new URL(
        '../../data/colored-pencils/caran-d-ache-luminance-6901/colors.json',
        import.meta.url
      ),
      new URL('../../data/colored-pencils/caran-d-ache-luminance-6901/sets.json', import.meta.url),
    ],
    [PaintBrand.VanGogh]: [
      new URL('../../data/colored-pencils/van-gogh/colors.json', import.meta.url),
      new URL('../../data/colored-pencils/van-gogh/sets.json', import.meta.url),
    ],
    [PaintBrand.Holbein]: [
      new URL('../../data/colored-pencils/holbein-artists/colors.json', import.meta.url),
      new URL('../../data/colored-pencils/holbein-artists/sets.json', import.meta.url),
    ],
    [PaintBrand.PrismacolorPremierSoftCore]: [
      new URL(
        '../../data/colored-pencils/prismacolor-premier-soft-core/colors.json',
        import.meta.url
      ),
      new URL(
        '../../data/colored-pencils/prismacolor-premier-soft-core/sets.json',
        import.meta.url
      ),
    ],
  },
  [PaintType.WatercolorPencils]: {
    [PaintBrand.DerwentInktense]: [
      new URL('../../data/watercolor-pencils/derwent-inktense/colors.json', import.meta.url),
      new URL('../../data/watercolor-pencils/derwent-inktense/sets.json', import.meta.url),
    ],
    [PaintBrand.DerwentWatercolour]: [
      new URL('../../data/watercolor-pencils/derwent-watercolour/colors.json', import.meta.url),
      new URL('../../data/watercolor-pencils/derwent-watercolour/sets.json', import.meta.url),
    ],
    [PaintBrand.CaranDAcheMuseumAquarelle]: [
      new URL(
        '../../data/watercolor-pencils/caran-d-ache-museum-aquarelle/colors.json',
        import.meta.url
      ),
      new URL(
        '../../data/watercolor-pencils/caran-d-ache-museum-aquarelle/sets.json',
        import.meta.url
      ),
    ],
  },
};

const PAINT_ID_FORMAT: Partial<Record<PaintType, Partial<Record<PaintBrand, PaintIdFormat>>>> = {
  [PaintType.WatercolorPaint]: {
    [PaintBrand.GansaiTambi]: {
      padWithLeadingZeros: false,
      prefix: 'No.',
    },
    [PaintBrand.Holbein]: {
      prefix: 'W',
    },
    [PaintBrand.DaVinci]: {
      padWithLeadingZeros: false,
      formatter: (id: string): string => {
        return id.length > 3 ? `${id.substring(0, 3)}-${id.substring(3)}` : id;
      },
    },
    [PaintBrand.MijelloMissionGold]: {
      prefix: 'W',
    },
  },
  [PaintType.OilPaint]: {
    [PaintBrand.MichaelHarding]: {
      prefix: 'No.',
    },
  },
  [PaintType.AcrylicPaint]: {
    [PaintBrand.VallejoAcrylicStudio]: {
      padLength: 3,
    },
  },
  [PaintType.ColoredPencils]: {
    [PaintBrand.DerwentColoursoft]: {
      prefix: 'C',
    },
    [PaintBrand.FaberCastellGoldfaber]: {
      prefix: 'A',
    },
    [PaintBrand.Holbein]: {
      prefix: 'OP',
    },
    [PaintBrand.PrismacolorPremierSoftCore]: {
      padWithLeadingZeros: false,
      prefix: 'PC',
    },
  },
  [PaintType.WatercolorPencils]: {
    [PaintBrand.DerwentWatercolour]: {
      padWithLeadingZeros: false,
    },
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

export function formatPaintId({type, brand, id, name}: Paint, maxId: number): string {
  const {padWithLeadingZeros, prefix, padLength, formatter}: PaintIdFormat = {
    padWithLeadingZeros: true,
    padLength: maxId.toString().length,
    formatter: (id: string) => id,
    ...(PAINT_ID_FORMAT[type]?.[brand] || {}),
  };
  if (padLength > 4) {
    return name;
  } else {
    const idStr: string = formatter(
      `${prefix ? prefix : ''}${padWithLeadingZeros ? String(id).padStart(padLength, '0') : id}`
    );
    return `${idStr} ${name}`;
  }
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
