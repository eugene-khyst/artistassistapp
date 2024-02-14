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

export const PENCIL_TYPES = [PaintType.ColoredPencils, PaintType.WatercolorPencils];

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

export interface PaintIdFormat {
  show?: boolean;
  prefix?: string;
  padLength?: number;
  formatter?: (id: string) => string;
}

export interface PaintBrandDefinition {
  fullName: string;
  shortName?: string;
  idFormat?: PaintIdFormat;
  paints: URL;
  paintSets: URL;
}

export const PAINT_TYPES = new Map<PaintType, string>([
  [PaintType.WatercolorPaint, 'Watercolor paint'],
  [PaintType.OilPaint, 'Oil paint'],
  [PaintType.AcrylicPaint, 'Acrylic paint'],
  [PaintType.ColoredPencils, 'Colored pencils'],
  [PaintType.WatercolorPencils, 'Watercolor pencils'],
]);

export const PAINT_BRANDS = new Map<PaintType, Map<PaintBrand, PaintBrandDefinition>>([
  [
    PaintType.WatercolorPaint,
    new Map([
      [
        PaintBrand.RosaGallery,
        {
          fullName: 'Rosa Gallery Watercolours',
          shortName: 'Rosa Gallery',
          idFormat: {
            padLength: 3,
          },
          paints: new URL('../../data/watercolor-paint/rosa-gallery/colors.json', import.meta.url),
          paintSets: new URL('../../data/watercolor-paint/rosa-gallery/sets.json', import.meta.url),
        },
      ],
      [
        PaintBrand.Rembrandt,
        {
          fullName: 'Rembrandt Watercolour',
          shortName: 'Rembrandt',
          idFormat: {
            padLength: 3,
          },
          paints: new URL('../../data/watercolor-paint/rembrandt/colors.json', import.meta.url),
          paintSets: new URL('../../data/watercolor-paint/rembrandt/sets.json', import.meta.url),
        },
      ],
      [
        PaintBrand.VanGogh,
        {
          fullName: 'Van Gogh Watercolour',
          shortName: 'Van Gogh',
          idFormat: {
            padLength: 3,
          },
          paints: new URL('../../data/watercolor-paint/van-gogh/colors.json', import.meta.url),
          paintSets: new URL('../../data/watercolor-paint/van-gogh/sets.json', import.meta.url),
        },
      ],
      [
        PaintBrand.DanielSmithExtraFine,
        {
          fullName: 'Daniel Smith Extra Fine Watercolors',
          shortName: 'Daniel Smith',
          idFormat: {
            show: false,
          },
          paints: new URL(
            '../../data/watercolor-paint/daniel-smith-extra-fine/colors.json',
            import.meta.url
          ),
          paintSets: new URL(
            '../../data/watercolor-paint/daniel-smith-extra-fine/sets.json',
            import.meta.url
          ),
        },
      ],
      [
        PaintBrand.DanielSmithPrimaTek,
        {
          fullName: 'Daniel Smith PrimaTek Watercolors',
          shortName: 'Daniel Smith PrimaTek',
          idFormat: {
            show: false,
          },
          paints: new URL(
            '../../data/watercolor-paint/daniel-smith-primatek/colors.json',
            import.meta.url
          ),
          paintSets: new URL(
            '../../data/watercolor-paint/daniel-smith-primatek/sets.json',
            import.meta.url
          ),
        },
      ],
      [
        PaintBrand.SchminckeHoradam,
        {
          fullName: 'Schmincke Horadam Aquarell',
          shortName: 'Horadam',
          idFormat: {
            padLength: 3,
          },
          paints: new URL('../../data/watercolor-paint/horadam/colors.json', import.meta.url),
          paintSets: new URL('../../data/watercolor-paint/horadam/sets.json', import.meta.url),
        },
      ],
      [
        PaintBrand.WinsorNewtonProfessional,
        {
          fullName: 'Winsor & Newton Professional Watercolour',
          shortName: 'Winsor & Newton Professional',
          idFormat: {
            padLength: 3,
          },
          paints: new URL('../../data/watercolor-paint/winsor-newton/colors.json', import.meta.url),
          paintSets: new URL(
            '../../data/watercolor-paint/winsor-newton/sets.json',
            import.meta.url
          ),
        },
      ],
      [
        PaintBrand.Sennelier,
        {
          fullName: "Sennelier l'Aquarelle",
          shortName: 'Sennelier',
          idFormat: {
            padLength: 3,
          },
          paints: new URL('../../data/watercolor-paint/sennelier/colors.json', import.meta.url),
          paintSets: new URL('../../data/watercolor-paint/sennelier/sets.json', import.meta.url),
        },
      ],
      [
        PaintBrand.OldHolland,
        {
          fullName: 'Old Holland Classic Watercolours',
          shortName: 'Old Holland',
          idFormat: {
            padLength: 3,
          },
          paints: new URL('../../data/watercolor-paint/old-holland/colors.json', import.meta.url),
          paintSets: new URL('../../data/watercolor-paint/old-holland/sets.json', import.meta.url),
        },
      ],
      [
        PaintBrand.GansaiTambi,
        {
          fullName: 'Kuretake Gansai Tambi',
          shortName: 'Gansai Tambi',
          idFormat: {
            prefix: 'No.',
          },
          paints: new URL('../../data/watercolor-paint/gansai-tambi/colors.json', import.meta.url),
          paintSets: new URL('../../data/watercolor-paint/gansai-tambi/sets.json', import.meta.url),
        },
      ],
      [
        PaintBrand.Holbein,
        {
          fullName: "Holbein Artists' Watercolor (HWC)",
          shortName: 'Holbein',
          idFormat: {
            padLength: 3,
            prefix: 'W',
          },
          paints: new URL('../../data/watercolor-paint/holbein/colors.json', import.meta.url),
          paintSets: new URL('../../data/watercolor-paint/holbein/sets.json', import.meta.url),
        },
      ],
      [
        PaintBrand.MGraham,
        {
          fullName: "M. Graham & Co. Artists' Watercolor",
          shortName: 'M. Graham',
          idFormat: {
            padLength: 3,
          },
          paints: new URL('../../data/watercolor-paint/m-graham/colors.json', import.meta.url),
          paintSets: new URL('../../data/watercolor-paint/m-graham/sets.json', import.meta.url),
        },
      ],
      [
        PaintBrand.DaVinci,
        {
          fullName: 'Da Vinci Artist Watercolor Paints',
          shortName: 'Da Vinci',
          idFormat: {
            formatter: (id: string): string => {
              return id.length > 3 ? `${id.substring(0, 3)}-${id.substring(3)}` : id;
            },
          },
          paints: new URL('../../data/watercolor-paint/da-vinci/colors.json', import.meta.url),
          paintSets: new URL('../../data/watercolor-paint/da-vinci/sets.json', import.meta.url),
        },
      ],
      [
        PaintBrand.ShinhanPwc,
        {
          fullName: 'ShinHan PWC, Extra Fine Watercolor',
          shortName: 'ShinHan PWC',
          idFormat: {
            padLength: 3,
          },
          paints: new URL('../../data/watercolor-paint/shinhan-pwc/colors.json', import.meta.url),
          paintSets: new URL('../../data/watercolor-paint/shinhan-pwc/sets.json', import.meta.url),
        },
      ],
      [
        PaintBrand.MaimeriBlu,
        {
          fullName: 'Maimeri Blu',
          idFormat: {
            padLength: 3,
          },
          paints: new URL('../../data/watercolor-paint/maimeri-blu/colors.json', import.meta.url),
          paintSets: new URL('../../data/watercolor-paint/maimeri-blu/sets.json', import.meta.url),
        },
      ],
      [
        PaintBrand.MijelloMissionGold,
        {
          fullName: 'Mijello Mission Gold Class Watercolor',
          shortName: 'Mijello Mission Gold',
          idFormat: {
            padLength: 3,
            prefix: 'W',
          },
          paints: new URL(
            '../../data/watercolor-paint/mijello-mission-gold/colors.json',
            import.meta.url
          ),
          paintSets: new URL(
            '../../data/watercolor-paint/mijello-mission-gold/sets.json',
            import.meta.url
          ),
        },
      ],
      [
        PaintBrand.WhiteNights,
        {
          fullName: "White Nights Extra Fine Artists' Watercolours",
          shortName: 'White Nights',
          idFormat: {
            padLength: 3,
          },
          paints: new URL('../../data/watercolor-paint/white-nights/colors.json', import.meta.url),
          paintSets: new URL('../../data/watercolor-paint/white-nights/sets.json', import.meta.url),
        },
      ],
    ]),
  ],
  [
    PaintType.OilPaint,
    new Map([
      [
        PaintBrand.SchminckeMussini,
        {
          fullName: 'Schmincke Mussini Oil Colours',
          shortName: 'Mussini',
          idFormat: {
            padLength: 3,
          },
          paints: new URL('../../data/oil-paint/mussini/colors.json', import.meta.url),
          paintSets: new URL('../../data/oil-paint/mussini/sets.json', import.meta.url),
        },
      ],
      [
        PaintBrand.SchminckeNormaProfessional,
        {
          fullName: 'Schmincke Norma Professional Oil Colours',
          shortName: 'Norma Professional',
          idFormat: {
            padLength: 3,
          },
          paints: new URL('../../data/oil-paint/norma-professional/colors.json', import.meta.url),
          paintSets: new URL('../../data/oil-paint/norma-professional/sets.json', import.meta.url),
        },
      ],
      [
        PaintBrand.OldHolland,
        {
          fullName: 'Old Holland Classic Oil Colours',
          shortName: 'Old Holland',
          idFormat: {
            padLength: 3,
          },
          paints: new URL('../../data/oil-paint/old-holland/colors.json', import.meta.url),
          paintSets: new URL('../../data/oil-paint/old-holland/sets.json', import.meta.url),
        },
      ],
      [
        PaintBrand.MichaelHarding,
        {
          fullName: 'Michael Harding',
          shortName: 'Michael Harding Oil Colours',
          idFormat: {
            padLength: 3,
            prefix: 'No.',
          },
          paints: new URL('../../data/oil-paint/michael-harding/colors.json', import.meta.url),
          paintSets: new URL('../../data/oil-paint/michael-harding/sets.json', import.meta.url),
        },
      ],
    ]),
  ],
  [
    PaintType.AcrylicPaint,
    new Map([
      [
        PaintBrand.SchminckePrimacryl,
        {
          fullName: 'Schmincke PRIMAcryl',
          shortName: 'PRIMAcryl',
          idFormat: {
            padLength: 3,
          },
          paints: new URL('../../data/acrylic-paint/primacryl/colors.json', import.meta.url),
          paintSets: new URL('../../data/acrylic-paint/primacryl/sets.json', import.meta.url),
        },
      ],
      [
        PaintBrand.WinsorNewtonProfessional,
        {
          fullName: 'Winsor & Newton Professional Acrylic',
          shortName: 'Winsor & Newton Professional',
          idFormat: {
            padLength: 3,
          },
          paints: new URL('../../data/acrylic-paint/winsor-newton/colors.json', import.meta.url),
          paintSets: new URL('../../data/acrylic-paint/winsor-newton/sets.json', import.meta.url),
        },
      ],
      [
        PaintBrand.OldHolland,
        {
          fullName: 'Old Holland New Masters Classic Acrylics',
          shortName: 'Old Holland',
          idFormat: {
            padLength: 3,
          },
          paints: new URL('../../data/acrylic-paint/old-holland/colors.json', import.meta.url),
          paintSets: new URL('../../data/acrylic-paint/old-holland/sets.json', import.meta.url),
        },
      ],
      [
        PaintBrand.VallejoAcrylicStudio,
        {
          fullName: 'Vallejo Acrylic Studio',
          idFormat: {
            padLength: 3,
          },
          paints: new URL(
            '../../data/acrylic-paint/vallejo-acrylic-studio/colors.json',
            import.meta.url
          ),
          paintSets: new URL(
            '../../data/acrylic-paint/vallejo-acrylic-studio/sets.json',
            import.meta.url
          ),
        },
      ],
      [
        PaintBrand.LascauxArtist,
        {
          fullName: 'Lascaux Artist',
          idFormat: {
            padLength: 3,
          },
          paints: new URL('../../data/acrylic-paint/lascaux-artist/colors.json', import.meta.url),
          paintSets: new URL('../../data/acrylic-paint/lascaux-artist/sets.json', import.meta.url),
        },
      ],
    ]),
  ],
  [
    PaintType.ColoredPencils,
    new Map([
      [
        PaintBrand.KohINoorPolycolor,
        {
          fullName: 'Koh-I-Noor Polycolor',
          idFormat: {
            padLength: 3,
          },
          paints: new URL(
            '../../data/colored-pencils/koh-i-noor-polycolor/colors.json',
            import.meta.url
          ),
          paintSets: new URL(
            '../../data/colored-pencils/koh-i-noor-polycolor/sets.json',
            import.meta.url
          ),
        },
      ],
      [
        PaintBrand.DerwentChromaflow,
        {
          fullName: 'Derwent Chromaflow Pencils',
          shortName: 'Derwent Chromaflow',
          idFormat: {
            padLength: 4,
          },
          paints: new URL(
            '../../data/colored-pencils/derwent-chromaflow/colors.json',
            import.meta.url
          ),
          paintSets: new URL(
            '../../data/colored-pencils/derwent-chromaflow/sets.json',
            import.meta.url
          ),
        },
      ],
      [
        PaintBrand.DerwentColoursoft,
        {
          fullName: 'Derwent Coloursoft Pencils',
          shortName: 'Derwent Coloursoft',
          idFormat: {
            padLength: 3,
            prefix: 'C',
          },
          paints: new URL(
            '../../data/colored-pencils/derwent-coloursoft/colors.json',
            import.meta.url
          ),
          paintSets: new URL(
            '../../data/colored-pencils/derwent-coloursoft/sets.json',
            import.meta.url
          ),
        },
      ],
      [
        PaintBrand.DerwentDrawing,
        {
          fullName: 'Derwent Colour Drawing Pencils',
          shortName: 'Derwent Drawing',
          idFormat: {
            padLength: 4,
          },
          paints: new URL(
            '../../data/colored-pencils/derwent-drawing/colors.json',
            import.meta.url
          ),
          paintSets: new URL(
            '../../data/colored-pencils/derwent-drawing/sets.json',
            import.meta.url
          ),
        },
      ],
      [
        PaintBrand.DerwentLightfast,
        {
          fullName: 'Derwent Lightfast Colour Pencils',
          shortName: 'Derwent Lightfast',
          idFormat: {
            show: false,
          },
          paints: new URL(
            '../../data/colored-pencils/derwent-lightfast/colors.json',
            import.meta.url
          ),
          paintSets: new URL(
            '../../data/colored-pencils/derwent-lightfast/sets.json',
            import.meta.url
          ),
        },
      ],
      [
        PaintBrand.DerwentProcolour,
        {
          fullName: 'Derwent Procolour Pencils',
          shortName: 'Derwent Procolour',
          idFormat: {
            padLength: 2,
          },
          paints: new URL(
            '../../data/colored-pencils/derwent-procolour/colors.json',
            import.meta.url
          ),
          paintSets: new URL(
            '../../data/colored-pencils/derwent-procolour/sets.json',
            import.meta.url
          ),
        },
      ],
      [
        PaintBrand.FaberCastellGoldfaber,
        {
          fullName: 'Faber-Castell Goldfaber Colour Pencils',
          shortName: 'Faber-Castell Goldfaber',
          idFormat: {
            padLength: 3,
            prefix: 'A',
          },
          paints: new URL(
            '../../data/colored-pencils/faber-castell-goldfaber/colors.json',
            import.meta.url
          ),
          paintSets: new URL(
            '../../data/colored-pencils/faber-castell-goldfaber/sets.json',
            import.meta.url
          ),
        },
      ],
      [
        PaintBrand.FaberCastellPolychromos,
        {
          fullName: 'Faber-Castell Polychromos Colour Pencils',
          shortName: 'Faber-Castell Polychromos',
          idFormat: {
            padLength: 3,
          },
          paints: new URL(
            '../../data/colored-pencils/faber-castell-polychromos/colors.json',
            import.meta.url
          ),
          paintSets: new URL(
            '../../data/colored-pencils/faber-castell-polychromos/sets.json',
            import.meta.url
          ),
        },
      ],
      [
        PaintBrand.CaranDAcheLuminance,
        {
          fullName: "Caran d'Ache Luminance 6901",
          shortName: "Caran d'Ache Luminance",
          idFormat: {
            padLength: 3,
          },
          paints: new URL(
            '../../data/colored-pencils/caran-d-ache-luminance-6901/colors.json',
            import.meta.url
          ),
          paintSets: new URL(
            '../../data/colored-pencils/caran-d-ache-luminance-6901/sets.json',
            import.meta.url
          ),
        },
      ],
      [
        PaintBrand.VanGogh,
        {
          fullName: 'Van Gogh Colour Pencils',
          shortName: 'Van Gogh',
          idFormat: {
            padLength: 3,
          },
          paints: new URL('../../data/colored-pencils/van-gogh/colors.json', import.meta.url),
          paintSets: new URL('../../data/colored-pencils/van-gogh/sets.json', import.meta.url),
        },
      ],
      [
        PaintBrand.Holbein,
        {
          fullName: "Holbein Artists' Colored Pencils",
          shortName: 'Holbein',
          idFormat: {
            padLength: 3,
            prefix: 'OP',
          },
          paints: new URL('../../data/colored-pencils/holbein/colors.json', import.meta.url),
          paintSets: new URL('../../data/colored-pencils/holbein/sets.json', import.meta.url),
        },
      ],
      [
        PaintBrand.PrismacolorPremierSoftCore,
        {
          fullName: 'Prismacolor Premier Soft Core Colored Pencils',
          shortName: 'Prismacolor Premier Soft Core',
          idFormat: {
            prefix: 'PC',
          },
          paints: new URL(
            '../../data/colored-pencils/prismacolor-premier-soft-core/colors.json',
            import.meta.url
          ),
          paintSets: new URL(
            '../../data/colored-pencils/prismacolor-premier-soft-core/sets.json',
            import.meta.url
          ),
        },
      ],
    ]),
  ],
  [
    PaintType.WatercolorPencils,
    new Map([
      [
        PaintBrand.DerwentInktense,
        {
          fullName: 'Derwent Inktense Pencils',
          shortName: 'Derwent Inktense',
          idFormat: {
            padLength: 4,
          },
          paints: new URL(
            '../../data/watercolor-pencils/derwent-inktense/colors.json',
            import.meta.url
          ),
          paintSets: new URL(
            '../../data/watercolor-pencils/derwent-inktense/sets.json',
            import.meta.url
          ),
        },
      ],
      [
        PaintBrand.DerwentWatercolour,
        {
          fullName: 'Derwent Watercolour Pencils',
          shortName: 'Derwent Watercolour',
          paints: new URL(
            '../../data/watercolor-pencils/derwent-watercolour/colors.json',
            import.meta.url
          ),
          paintSets: new URL(
            '../../data/watercolor-pencils/derwent-watercolour/sets.json',
            import.meta.url
          ),
        },
      ],
      [
        PaintBrand.CaranDAcheMuseumAquarelle,
        {
          fullName: "Caran d'Ache Museum Aquarelle",
          shortName: "Caran d'Ache Museum Aquarelle",
          idFormat: {
            padLength: 3,
          },
          paints: new URL(
            '../../data/watercolor-pencils/caran-d-ache-museum-aquarelle/colors.json',
            import.meta.url
          ),
          paintSets: new URL(
            '../../data/watercolor-pencils/caran-d-ache-museum-aquarelle/sets.json',
            import.meta.url
          ),
        },
      ],
    ]),
  ],
]);

const comparePaintBrandsByName = (
  {fullName: a}: PaintBrandDefinition,
  {fullName: b}: PaintBrandDefinition
) => a.localeCompare(b);

export const comparePaintBrandEntries = (
  [_0, a]: [PaintBrand, PaintBrandDefinition],
  [_1, b]: [PaintBrand, PaintBrandDefinition]
) => comparePaintBrandsByName(a, b);

export async function fetchPaints(type: PaintType, brand: PaintBrand): Promise<Map<number, Paint>> {
  const url = PAINT_BRANDS.get(type)?.get(brand)?.paints;
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
  const url = PAINT_BRANDS.get(type)?.get(brand)?.paintSets;
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

export function formatPaintLabel({type, brand, id, name}: Paint): string {
  const {show, prefix, padLength, formatter}: PaintIdFormat = {
    show: true,
    formatter: (id: string) => id,
    ...(PAINT_BRANDS.get(type)?.get(brand)?.idFormat || {}),
  };
  const idStr: string = show
    ? formatter(`${prefix ? prefix : ''}${padLength ? String(id).padStart(padLength, '0') : id}`)
    : '';
  return `${idStr} ${name}`;
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
