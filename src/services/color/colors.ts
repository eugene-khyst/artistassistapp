/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import type {RgbTuple} from './space';
import {Rgb} from './space';

export enum ColorType {
  WatercolorPaint = 1,
  OilPaint = 2,
  AcrylicPaint = 3,
  ColoredPencils = 4,
  WatercolorPencils = 5,
  Gouache = 6,
  AcrylicGouache = 7,
}

export enum ColorBrand {
  Rembrandt = 1,
  VanGogh = 2,
  DanielSmithExtraFine = 3,
  SchminckeHoradam = 4,
  SchminckeMussini = 5,
  SchminckeNorma = 6,
  WinsorNewton = 7,
  Sennelier = 8,
  OldHolland = 9,
  RosaGallery = 10,
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
  Lascaux = 33,
  Maimeri = 34,
  MijelloMissionGold = 35,
  WhiteNights = 36,
  RomanSzmal = 37,
  LiquitexHeavyBody = 38,
  LiquitexSoftBody = 39,
  GoldenFluid = 40,
  GoldenHeavyBody = 41,
  GoldenOpen = 42,
  GoldenSoflat = 43,
  GoldenQoR = 44,
  GoldenWilliamsburg = 45,
  AGallo = 46,
  Blockx = 47,
  VallejoAcrylicArtistColor = 48,
  LiquitexAcrylicGouache = 49,
  WinsorNewtonWinton = 50,
  WinsorNewtonGriffinAlkyd = 51,
  HolbeinIrodori = 52,
  Talens = 53,
  SchminckeDesignersGouache = 54,
  Turner = 55,
  DalerRowneyDesignersGouache = 56,
  DalerRowneyAquafineGouache = 57,
  LefrancBourgeoisLinel = 58,
}

export enum ColorOpacity {
  Transparent = 1,
  SemiTransparent = 2,
  SemiOpaque = 3,
  Opaque = 4,
}

export type ColorRecord = [id: number, name: string, hex: string, rho: number[], opacity: number];

export interface Color {
  type: ColorType;
  brand: ColorBrand;
  id: number;
  name: string;
  rgb: RgbTuple;
  rho: number[];
  opacity: ColorOpacity;
}

export interface StandardColorSet {
  name: string;
  colors: number[];
}

export interface ColorSetDefinition {
  type?: ColorType;
  brands: ColorBrand[];
  standardColorSet?: [0] | [ColorBrand, string];
  colors: Partial<Record<ColorBrand, number[]>>;
  timestamp?: number;
}

export interface ColorSet {
  type: ColorType;
  colors: Color[];
}

export interface ColorIdFormat {
  show?: boolean;
  prefix?: string;
  padLength?: number;
  formatter?: (id: string) => string;
}

export interface ColorTypeDefinition {
  name: string;
  dir: string;
}

export interface ColorBrandDefinition {
  fullName: string;
  shortName?: string;
  idFormat?: ColorIdFormat;
  dir: string;
}

export const COLOR_TYPES = new Map<ColorType, ColorTypeDefinition>([
  [ColorType.WatercolorPaint, {name: 'Watercolor paint', dir: 'watercolor-paint'}],
  [ColorType.Gouache, {name: 'Gouache', dir: 'gouache'}],
  [ColorType.AcrylicGouache, {name: 'Acrylic gouache', dir: 'acrylic-gouache'}],
  [ColorType.AcrylicPaint, {name: 'Acrylic paint', dir: 'acrylic-paint'}],
  [ColorType.OilPaint, {name: 'Oil paint', dir: 'oil-paint'}],
  [ColorType.ColoredPencils, {name: 'Colored pencils', dir: 'colored-pencils'}],
  [ColorType.WatercolorPencils, {name: 'Watercolor pencils', dir: 'watercolor-pencils'}],
]);

export const COLOR_BRANDS = new Map<ColorType, Map<ColorBrand, ColorBrandDefinition>>([
  [
    ColorType.WatercolorPaint,
    new Map([
      [
        ColorBrand.RosaGallery,
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
        ColorBrand.Rembrandt,
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
        ColorBrand.VanGogh,
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
        ColorBrand.DanielSmithExtraFine,
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
        ColorBrand.DanielSmithPrimaTek,
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
        ColorBrand.SchminckeHoradam,
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
        ColorBrand.WinsorNewton,
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
        ColorBrand.Sennelier,
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
        ColorBrand.OldHolland,
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
        ColorBrand.Holbein,
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
        ColorBrand.MGraham,
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
        ColorBrand.DaVinci,
        {
          fullName: 'Da Vinci Artist Watercolors',
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
        ColorBrand.ShinhanPwc,
        {
          fullName: 'ShinHan PWC, Extra Fine Watercolor',
          shortName: 'ShinHan PWC',
          idFormat: {
            padLength: 3,
          },
          dir: 'shinhan',
        },
      ],
      [
        ColorBrand.Maimeri,
        {
          fullName: 'Maimeri Blu',
          idFormat: {
            padLength: 3,
          },
          dir: 'maimeri-blu',
        },
      ],
      [
        ColorBrand.MijelloMissionGold,
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
        ColorBrand.WhiteNights,
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
        ColorBrand.RomanSzmal,
        {
          fullName: 'Roman Szmal Aquarius',
          shortName: 'Roman Szmal',
          idFormat: {
            padLength: 3,
          },
          dir: 'roman-szmal',
        },
      ],
      [
        ColorBrand.GoldenQoR,
        {
          fullName: 'QoR Artist Watercolors',
          shortName: 'QoR',
          idFormat: {
            show: false,
          },
          dir: 'golden-qor',
        },
      ],
      [
        ColorBrand.AGallo,
        {
          fullName: 'A. Gallo Honey-Based Watercolors',
          shortName: 'A. Gallo',
          idFormat: {
            padLength: 3,
          },
          dir: 'a-gallo',
        },
      ],
      [
        ColorBrand.Blockx,
        {
          fullName: 'Blockx Watercolors',
          shortName: 'Blockx',
          idFormat: {
            show: false,
          },
          dir: 'blockx',
        },
      ],
      [
        ColorBrand.MichaelHarding,
        {
          fullName: 'Michael Harding',
          shortName: 'Michael Harding Watercolours',
          idFormat: {
            padLength: 3,
            prefix: 'W',
          },
          dir: 'michael-harding',
        },
      ],
    ]),
  ],
  [
    ColorType.OilPaint,
    new Map([
      [
        ColorBrand.SchminckeMussini,
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
        ColorBrand.SchminckeNorma,
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
        ColorBrand.OldHolland,
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
        ColorBrand.MichaelHarding,
        {
          fullName: 'Michael Harding Oil Colours',
          shortName: 'Michael Harding',
          idFormat: {
            padLength: 3,
            prefix: 'No.',
          },
          dir: 'michael-harding',
        },
      ],
      [
        ColorBrand.GoldenWilliamsburg,
        {
          fullName: 'Williamsburg Artist Oil Colors',
          shortName: 'Williamsburg',
          idFormat: {
            show: false,
          },
          dir: 'golden-williamsburg',
        },
      ],
      [
        ColorBrand.WinsorNewtonWinton,
        {
          fullName: 'Winsor & Newton Winton Oil Colour',
          shortName: 'Winsor & Newton Winton',
          dir: 'winsor-newton-winton',
        },
      ],
      [
        ColorBrand.WinsorNewtonGriffinAlkyd,
        {
          fullName: 'Winsor & Newton Griffin Alkyd Fast Drying Oil Colour',
          shortName: 'Winsor & Newton Griffin Alkyd',
          dir: 'winsor-newton-griffin-alkyd',
        },
      ],
    ]),
  ],
  [
    ColorType.AcrylicPaint,
    new Map([
      [
        ColorBrand.SchminckePrimacryl,
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
        ColorBrand.WinsorNewton,
        {
          fullName: 'Winsor & Newton Professional Acrylic',
          shortName: 'Winsor & Newton Professional',
          dir: 'winsor-newton',
        },
      ],
      [
        ColorBrand.OldHolland,
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
        ColorBrand.VallejoAcrylicStudio,
        {
          fullName: 'Vallejo Acrylic Studio',
          idFormat: {
            padLength: 3,
          },
          dir: 'vallejo-studio',
        },
      ],
      [
        ColorBrand.VallejoAcrylicArtistColor,
        {
          fullName: 'Vallejo Acrylic Artist Color',
          idFormat: {
            padLength: 3,
          },
          dir: 'vallejo-artist',
        },
      ],
      [
        ColorBrand.Lascaux,
        {
          fullName: 'Lascaux Artist',
          shortName: 'Lascaux',
          idFormat: {
            padLength: 3,
          },
          dir: 'lascaux',
        },
      ],
      [
        ColorBrand.LiquitexHeavyBody,
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
        ColorBrand.LiquitexSoftBody,
        {
          fullName: 'Liquitex Soft Body Acrylic',
          shortName: 'Liquitex Soft Body',
          idFormat: {
            padLength: 3,
          },
          dir: 'liquitex-soft-body',
        },
      ],
      [
        ColorBrand.GoldenFluid,
        {
          fullName: 'Golden Fluid Acrylics',
          shortName: 'Golden Fluid',
          idFormat: {
            padLength: 4,
          },
          dir: 'golden-fluid',
        },
      ],
      [
        ColorBrand.GoldenHeavyBody,
        {
          fullName: 'Golden Heavy Body Acrylics',
          shortName: 'Golden Heavy Body',
          idFormat: {
            padLength: 4,
          },
          dir: 'golden-heavy-body',
        },
      ],
      [
        ColorBrand.GoldenOpen,
        {
          fullName: 'Golden OPEN Slow-Drying Acrylics',
          shortName: 'Golden OPEN',
          idFormat: {
            padLength: 4,
          },
          dir: 'golden-open',
        },
      ],
      [
        ColorBrand.GoldenSoflat,
        {
          fullName: 'Golden SoFlat Matte Acrylics',
          shortName: 'Golden SoFlat',
          idFormat: {
            padLength: 4,
          },
          dir: 'golden-soflat',
        },
      ],
    ]),
  ],
  [
    ColorType.ColoredPencils,
    new Map([
      [
        ColorBrand.KohINoorPolycolor,
        {
          fullName: 'Koh-I-Noor Polycolor',
          idFormat: {
            padLength: 3,
          },
          dir: 'koh-i-noor-polycolor',
        },
      ],
      [
        ColorBrand.DerwentChromaflow,
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
        ColorBrand.DerwentColoursoft,
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
        ColorBrand.DerwentDrawing,
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
        ColorBrand.DerwentLightfast,
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
        ColorBrand.DerwentProcolour,
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
        ColorBrand.FaberCastellGoldfaber,
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
        ColorBrand.FaberCastellPolychromos,
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
        ColorBrand.CaranDAcheLuminance,
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
        ColorBrand.VanGogh,
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
        ColorBrand.Holbein,
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
        ColorBrand.PrismacolorPremierSoftCore,
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
    ColorType.WatercolorPencils,
    new Map([
      [
        ColorBrand.DerwentInktense,
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
        ColorBrand.DerwentWatercolour,
        {
          fullName: 'Derwent Watercolour Pencils',
          shortName: 'Derwent Watercolour',
          dir: 'derwent-watercolour',
        },
      ],
      [
        ColorBrand.CaranDAcheMuseumAquarelle,
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
  [
    ColorType.Gouache,
    new Map([
      [
        ColorBrand.Holbein,
        {
          fullName: 'Holbein Artist Gouache',
          shortName: 'Holbein',
          idFormat: {
            padLength: 3,
            prefix: 'G',
          },
          dir: 'holbein',
        },
      ],
      [
        ColorBrand.HolbeinIrodori,
        {
          fullName: 'Holbein Irodori Artist Gouache',
          shortName: 'Holbein Irodori',
          idFormat: {
            padLength: 3,
            prefix: 'G',
          },
          dir: 'holbein-irodori',
        },
      ],
      [
        ColorBrand.Talens,
        {
          fullName: 'Talens Gouache Extra Fine',
          shortName: 'Talens',
          idFormat: {
            padLength: 3,
          },
          dir: 'talens',
        },
      ],
      [
        ColorBrand.SchminckeDesignersGouache,
        {
          fullName: 'Schmincke Designers Gouache',
          idFormat: {
            padLength: 3,
          },
          dir: 'schmincke-designers-gouache',
        },
      ],
      [
        ColorBrand.SchminckeHoradam,
        {
          fullName: 'Schmincke Horadam Gouache',
          shortName: 'Horadam',
          idFormat: {
            padLength: 3,
          },
          dir: 'horadam',
        },
      ],
      [
        ColorBrand.SchminckeHoradam,
        {
          fullName: "Da Vinci Artists' Gouache",
          shortName: 'Da Vinci',
          idFormat: {
            padLength: 3,
          },
          dir: 'da-vinci',
        },
      ],
      [
        ColorBrand.WinsorNewton,
        {
          fullName: 'Winsor & Newton Designers Gouache',
          shortName: 'Winsor & Newton',
          dir: 'winsor-newton',
        },
      ],
      [
        ColorBrand.DanielSmithExtraFine,
        {
          fullName: 'Daniel Smith Extra Fine Gouache',
          shortName: 'Daniel Smith',
          idFormat: {
            show: false,
          },
          dir: 'daniel-smith-extra-fine',
        },
      ],
      [
        ColorBrand.DalerRowneyDesignersGouache,
        {
          fullName: "Daler Rowney Professional Designers' Gouache",
          shortName: "Daler Rowney Designers' Gouache",
          idFormat: {
            padLength: 3,
          },
          dir: 'daler-rowney-designers-gouache',
        },
      ],
      [
        ColorBrand.DalerRowneyAquafineGouache,
        {
          fullName: 'Daler Rowney Aquafine Gouache',
          idFormat: {
            padLength: 3,
          },
          dir: 'daler-rowney-aquafine-gouache',
        },
      ],
      [
        ColorBrand.Maimeri,
        {
          fullName: 'Maimeri Gouache',
          idFormat: {
            padLength: 3,
          },
          dir: 'maimeri',
        },
      ],
      [
        ColorBrand.LefrancBourgeoisLinel,
        {
          fullName: 'Lefranc & Bourgeois Linel Extra-Fine Gouache',
          shortName: 'Linel Extra-Fine Gouache',
          idFormat: {
            padLength: 3,
          },
          dir: 'lefranc-bourgeois-linel',
        },
      ],
    ]),
  ],
  [
    ColorType.AcrylicGouache,
    new Map([
      [
        ColorBrand.LiquitexAcrylicGouache,
        {
          fullName: 'Liquitex Acrylic Gouache',
          shortName: 'Liquitex',
          idFormat: {
            padLength: 3,
          },
          dir: 'liquitex',
        },
      ],
      [
        ColorBrand.Holbein,
        {
          fullName: 'Holbein Acrylic Gouache',
          shortName: 'Holbein',
          idFormat: {
            padLength: 3,
            prefix: 'D',
          },
          dir: 'holbein',
        },
      ],
      [
        ColorBrand.Turner,
        {
          fullName: 'Turner Acryl Gouache',
          shortName: 'Turner',
          dir: 'turner',
        },
      ],
      [
        ColorBrand.Lascaux,
        {
          fullName: 'Lascaux Gouache',
          shortName: 'Lascaux',
          idFormat: {
            padLength: 3,
          },
          dir: 'lascaux',
        },
      ],
    ]),
  ],
]);

const compareColorBrandsByName = (
  {fullName: a}: ColorBrandDefinition,
  {fullName: b}: ColorBrandDefinition
) => a.localeCompare(b);

export const compareColorBrandEntries = (
  [, a]: [ColorBrand, ColorBrandDefinition],
  [, b]: [ColorBrand, ColorBrandDefinition]
) => compareColorBrandsByName(a, b);

function getJsonUrl(type: ColorType, brand: ColorBrand, resourceType: 'colors' | 'sets'): string {
  const typeDir = COLOR_TYPES.get(type)?.dir;
  const brandDir = COLOR_BRANDS.get(type)?.get(brand)?.dir;
  if (!typeDir || !brandDir) {
    throw new Error(`Unknown paint brand ${brand} for type ${type}`);
  }
  return `/data/${typeDir}/${brandDir}/${resourceType}.json`;
}

export async function fetchColors(type: ColorType, brand: ColorBrand): Promise<Map<number, Color>> {
  const url = getJsonUrl(type, brand, 'colors');
  const response = await fetch(url);
  const colors: ColorRecord[] = (await response.json()) as ColorRecord[];
  return new Map(
    colors
      .map(
        ([id, name, hex, rho, opacity]: ColorRecord): Color => ({
          type,
          brand,
          id,
          name,
          rgb: Rgb.fromHex(hex).toRgbTuple(),
          rho,
          opacity,
        })
      )
      .map((color: Color) => [color.id, color])
  );
}

export async function fetchColorsBulk(
  type: ColorType,
  brands: ColorBrand[]
): Promise<Map<ColorBrand, Map<number, Color>>> {
  return new Map(
    await Promise.all(
      brands.map(
        async (brand: ColorBrand): Promise<[ColorBrand, Map<number, Color>]> => [
          brand,
          await fetchColors(type, brand),
        ]
      )
    )
  );
}

export async function fetchStandardColorSets(
  type: ColorType,
  brand: ColorBrand
): Promise<Map<string, StandardColorSet>> {
  const url = getJsonUrl(type, brand, 'sets');
  const response = await fetch(url);
  const sets: StandardColorSet[] = (await response.json()) as StandardColorSet[];
  return new Map(
    sets.map((standardColorSet: StandardColorSet) => [standardColorSet.name, standardColorSet])
  );
}

export function formatColorLabel({type, brand, id, name}: Color): string {
  const {show, prefix, padLength, formatter}: ColorIdFormat = {
    show: true,
    formatter: (id: string) => id,
    ...(COLOR_BRANDS.get(type)?.get(brand)?.idFormat || {}),
  };
  const idStr: string = show
    ? formatter(`${prefix ? prefix : ''}${padLength ? String(id).padStart(padLength, '0') : id}`)
    : '';
  return `${idStr} ${name}`;
}

export function toColorSet(
  {type, colors: selectedColors}: ColorSetDefinition,
  colors: Map<ColorBrand, Map<number, Color>>
): ColorSet {
  if (!type || !Object.entries(selectedColors).length) {
    throw new Error('Colors type or colors are missing');
  }
  return {
    type,
    colors: Object.entries(selectedColors).flatMap(
      ([brand, colorIds]: [string, number[]]): Color[] =>
        colorIds.flatMap((colorId: number): Color[] => {
          const color: Color | undefined = colors?.get(Number(brand) as ColorBrand)?.get(colorId);
          return !color ? [] : [color];
        })
    ),
  };
}
