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
  RomanSzmal = 37,
  LiquitexHeavyBody = 38,
  LiquitexSoftBody = 39,
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

export interface PaintTypeDefinition {
  name: string;
  dir: string;
}

export interface PaintBrandDefinition {
  fullName: string;
  shortName?: string;
  idFormat?: PaintIdFormat;
  dir: string;
}

export const PAINT_TYPES = new Map<PaintType, PaintTypeDefinition>([
  [PaintType.WatercolorPaint, {name: 'Watercolor paint', dir: 'watercolor-paint'}],
  [PaintType.OilPaint, {name: 'Oil paint', dir: 'oil-paint'}],
  [PaintType.AcrylicPaint, {name: 'Acrylic paint', dir: 'acrylic-paint'}],
  [PaintType.ColoredPencils, {name: 'Colored pencils', dir: 'colored-pencils'}],
  [PaintType.WatercolorPencils, {name: 'Watercolor pencils', dir: 'watercolor-pencils'}],
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
          dir: 'rosa-gallery',
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
          dir: 'rembrandt',
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
          dir: 'van-gogh',
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
          dir: 'daniel-smith-extra-fine',
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
          dir: 'daniel-smith-primatek',
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
          dir: 'horadam',
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
          dir: 'winsor-newton',
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
          dir: 'sennelier',
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
          dir: 'old-holland',
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
          dir: 'gansai-tambi',
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
          dir: 'holbein',
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
          dir: 'm-graham',
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
          dir: 'da-vinci',
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
          dir: 'shinhan-pwc',
        },
      ],
      [
        PaintBrand.MaimeriBlu,
        {
          fullName: 'Maimeri Blu',
          idFormat: {
            padLength: 3,
          },
          dir: 'maimeri-blu',
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
          dir: 'mijello-mission-gold',
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
          dir: 'white-nights',
        },
      ],
      [
        PaintBrand.RomanSzmal,
        {
          fullName: 'Roman Szmal Aquarius',
          shortName: 'Roman Szmal',
          idFormat: {
            padLength: 3,
          },
          dir: 'roman-szmal',
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
          dir: 'mussini',
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
          dir: 'norma-professional',
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
          dir: 'old-holland',
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
          dir: 'michael-harding',
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
          dir: 'primacryl',
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
          dir: 'winsor-newton',
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
          dir: 'old-holland',
        },
      ],
      [
        PaintBrand.VallejoAcrylicStudio,
        {
          fullName: 'Vallejo Acrylic Studio',
          idFormat: {
            padLength: 3,
          },
          dir: 'vallejo-acrylic-studio',
        },
      ],
      [
        PaintBrand.LascauxArtist,
        {
          fullName: 'Lascaux Artist',
          idFormat: {
            padLength: 3,
          },
          dir: 'lascaux-artist',
        },
      ],
      [
        PaintBrand.LiquitexHeavyBody,
        {
          fullName: 'Liquitex Heavy Body Acrylic',
          shortName: 'Liquitex Heavy Body',
          idFormat: {
            padLength: 3,
          },
          dir: 'liquitex-heavy-body',
        },
      ],
      [
        PaintBrand.LiquitexSoftBody,
        {
          fullName: 'Liquitex Soft Body Acrylic',
          shortName: 'Liquitex Soft Body',
          idFormat: {
            padLength: 3,
          },
          dir: 'liquitex-soft-body',
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
          dir: 'koh-i-noor-polycolor',
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
          dir: 'derwent-chromaflow',
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
          dir: 'derwent-coloursoft',
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
          dir: 'derwent-drawing',
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
          dir: 'derwent-lightfast',
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
          dir: 'derwent-procolour',
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
          dir: 'faber-castell-goldfaber',
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
          dir: 'faber-castell-polychromos',
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
          dir: 'caran-d-ache-luminance',
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
          dir: 'van-gogh',
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
          dir: 'holbein',
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
          dir: 'prismacolor-premier-soft-core',
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
          dir: 'derwent-inktense',
        },
      ],
      [
        PaintBrand.DerwentWatercolour,
        {
          fullName: 'Derwent Watercolour Pencils',
          shortName: 'Derwent Watercolour',
          dir: 'derwent-watercolour',
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
          dir: 'caran-d-ache-museum-aquarelle',
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

function getJsonUrl(type: PaintType, brand: PaintBrand, resourceType: 'colors' | 'sets'): string {
  const typeDir = PAINT_TYPES.get(type)?.dir;
  const brandDir = PAINT_BRANDS.get(type)?.get(brand)?.dir;
  if (!typeDir || !brandDir) {
    throw new Error(`Unknown paint brand ${brand} for type ${type}`);
  }
  return `/data/${typeDir}/${brandDir}/${resourceType}.json`;
}

export async function fetchPaints(type: PaintType, brand: PaintBrand): Promise<Map<number, Paint>> {
  const url = getJsonUrl(type, brand, 'colors');
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
  const url = getJsonUrl(type, brand, 'sets');
  const response = await fetch(url);
  const sets: StoreBoughtPaintSet[] = await response.json();
  return new Map(
    sets.map((storeBoughtPaintSet: StoreBoughtPaintSet) => [
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
