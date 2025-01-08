/**
 * ArtistAssistApp
 * Copyright (C) 2023-2024  Eugene Khyst
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import type {Remote} from 'comlink';
import {wrap} from 'comlink';
import {create} from 'zustand';

import type {User} from '~/src/services/auth';
import type {
  ColorBrandDefinition,
  ColorDefinition,
  ColorMixer,
  ColorMixture,
  ColorSet,
  ColorSetDefinition,
  ColorType,
  CustomColorBrandDefinition,
  SamplingArea,
  SimilarColor,
} from '~/src/services/color';
import {fetchColorBrands, fetchColorsBulk, PAPER_WHITE_HEX, toColorSet} from '~/src/services/color';
import {Rgb, type RgbTuple} from '~/src/services/color/space';
import {
  deleteColorMixture,
  deleteColorSet,
  deleteImageFile,
  getAppSettings,
  getColorMixtures,
  getColorSetsByType,
  getImageFiles,
  getLastColorSet,
  getLastImageFile,
  saveAppSettings,
  saveColorMixture,
  saveColorSet,
  saveImageFile,
} from '~/src/services/db';
import {
  deleteCustomColorBrand,
  getCustomColorBrands,
  saveCustomColorBrand,
} from '~/src/services/db/custom-brand-db';
import type {AdjustmentParameters, ImageFile, LimitedPalette} from '~/src/services/image';
import {Blur, ColorCorrection, imageFileToFile, Outline, TonalValues} from '~/src/services/image';
import type {RgbChannelsPercentileCalculator} from '~/src/services/image/rgb-channels-percentile';
import type {Game, Player, Score} from '~/src/services/rating';
import {Tournament} from '~/src/services/rating';
import type {AppSettings} from '~/src/services/settings';
import {importFromUrl} from '~/src/services/url';
import {TabKey} from '~/src/tabs';
import {createScaledImageBitmap, IMAGE_SIZE} from '~/src/utils';

const colorMixer: Remote<ColorMixer> = wrap(
  new Worker(new URL('../services/color/worker/color-mixer-worker.ts', import.meta.url), {
    type: 'module',
  })
);

const tonalValues: TonalValues = new TonalValues();

const blur: Blur = new Blur();

const outline: Outline = new Outline();

const limitedPalette: Remote<LimitedPalette> = wrap(
  new Worker(new URL('../services/image/worker/limited-palette-worker.ts', import.meta.url), {
    type: 'module',
  })
);

const rgbChannelsPercentileCalculator: Remote<RgbChannelsPercentileCalculator> = wrap(
  new Worker(
    new URL('../services/image/worker/rgb-channels-percentile-worker.ts', import.meta.url),
    {
      type: 'module',
    }
  )
);

const colorCorrection: ColorCorrection = new ColorCorrection();

export interface AppState {
  activeTabKey: TabKey;

  isInitialStateLoading: boolean;

  importedColorSet: ColorSetDefinition | null;
  latestColorSet: ColorSetDefinition | null;
  colorSetsByType: ColorSetDefinition[];
  colorSet: ColorSet | null;
  isColorMixerSetLoading: boolean;

  imageFile: ImageFile | null;
  recentImageFiles: ImageFile[];

  originalImageFile: File | null;
  originalImage: ImageBitmap | null;
  isOriginalImageLoading: boolean;

  backgroundColor: string;
  isColorMixerBackgroundLoading: boolean;
  targetColor: string;
  samplingArea: SamplingArea | null;
  colorPickerPipet: SamplingArea | null;
  similarColors: SimilarColor[];
  isSimilarColorsLoading: boolean;

  paletteColorMixtures: ColorMixture[];

  tonalImages: ImageBitmap[];
  isTonalImagesLoading: boolean;

  blurredImages: ImageBitmap[];
  isBlurredImagesLoading: boolean;

  outlineImage: ImageBitmap | null;
  isOutlineImageLoading: boolean;

  limitedPaletteImage: ImageBitmap | null;
  isLimitedPaletteImageLoading: boolean;

  imageFileToAdjust: File | null;
  unadjustedImage: ImageBitmap | null;
  adjustedImage: ImageBitmap | null;
  isAdjustedImageLoading: boolean;

  imageToRemoveBg: File | null;

  tournament: Tournament<File>;
  unfinishedGamesSize: number;
  nextGame: Game<File> | null;
  playersByRating: Player<File>[];

  customColorBrands: CustomColorBrandDefinition[];
}

export interface AppActions {
  setActiveTabKey: (activeTabKey: TabKey) => Promise<void>;

  loadColorSetsByType: (type: ColorType) => Promise<ColorSetDefinition[]>;
  setColorSet: (colorSet: ColorSet, setActiveTabKey?: boolean) => Promise<void>;
  saveColorSet: (
    user: User | null,
    colorSetDefinition: ColorSetDefinition,
    brands?: Map<number, ColorBrandDefinition>,
    colors?: Map<string, Map<number, ColorDefinition>>
  ) => Promise<ColorSetDefinition>;
  deleteColorSet: (idToDelete: number) => Promise<void>;

  setImageFile: (imageFile: ImageFile | null, setActiveTabKey?: boolean) => Promise<void>;
  saveRecentImageFile: (imageFile: ImageFile) => Promise<void>;
  deleteRecentImageFile: (imageFile: ImageFile) => Promise<void>;

  setBackgroundColor: (backgroundColor: string | RgbTuple) => Promise<void>;
  setTargetColor: (color: string, samplingArea: SamplingArea | null) => Promise<void>;
  setColorPickerPipet: (colorPickerPipet: SamplingArea | null) => void;

  saveToPalette: (colorMixture: ColorMixture, linkToImage?: boolean) => Promise<void>;
  deleteFromPalette: (colorMixture: ColorMixture) => Promise<void>;
  deleteAllFromPalette: (type: ColorType) => Promise<void>;

  loadTonalImages: () => Promise<void>;

  loadBlurredImages: () => Promise<void>;

  loadOutlineImage: () => Promise<void>;

  setLimitedColorSet: (limitedColorSet: ColorSet) => Promise<void>;

  setImageFileToAdjust: (imageFileToAdjust: File | null) => Promise<void>;
  adjustImageColor: (
    whitePatchPercentile: number,
    adjustmentParams: AdjustmentParameters
  ) => Promise<void>;

  setImageToRemoveBg: (imageToRemoveBg: File | null) => void;

  updateTournament: () => void;

  addPlayer: (player: Player<File>) => void;
  setScore: (score: Score) => void;
  newTournament: () => void;

  loadCustomColorBrands: () => Promise<void>;
  saveCustomColorBrand: (brand: CustomColorBrandDefinition) => Promise<CustomColorBrandDefinition>;
  deleteCustomColorBrand: (idToDelete?: number) => Promise<void>;

  initAppStore: (user: User | null) => Promise<void>;
}

export const useAppStore = create<AppState & AppActions>((set, get) => ({
  activeTabKey: TabKey.ColorSet,

  isInitialStateLoading: false,

  importedColorSet: null,
  latestColorSet: null,
  colorSetsByType: [],
  colorSet: null,
  isColorMixerSetLoading: false,

  imageFile: null,
  recentImageFiles: [],

  originalImageFile: null,
  originalImage: null,
  isOriginalImageLoading: false,

  isColorMixerBackgroundLoading: false,
  backgroundColor: PAPER_WHITE_HEX,
  targetColor: PAPER_WHITE_HEX,
  samplingArea: null,
  colorPickerPipet: null,
  similarColors: [],
  isSimilarColorsLoading: false,

  paletteColorMixtures: [],

  tonalImages: [],
  isTonalImagesLoading: false,

  blurredImages: [],
  isBlurredImagesLoading: false,

  outlineImage: null,
  isOutlineImageLoading: false,

  limitedPaletteImage: null,
  isLimitedPaletteImageLoading: false,

  imageFileToAdjust: null,
  unadjustedImage: null,
  adjustedImage: null,
  isAdjustedImageLoading: false,

  imageToRemoveBg: null,

  tournament: new Tournament(),
  unfinishedGamesSize: 0,
  nextGame: null,
  playersByRating: [],

  customColorBrands: [],

  setActiveTabKey: async (activeTabKey: TabKey): Promise<void> => {
    await saveAppSettings({activeTabKey});
    set({activeTabKey});
    if (activeTabKey === TabKey.TonalValues && !get().tonalImages.length) {
      void get().loadTonalImages();
    } else if (activeTabKey === TabKey.SimplifiedPhoto && !get().blurredImages.length) {
      void get().loadBlurredImages();
    } else if (activeTabKey === TabKey.Outline && !get().outlineImage) {
      void get().loadOutlineImage();
    }
  },

  loadColorSetsByType: async (type: ColorType): Promise<ColorSetDefinition[]> => {
    const colorSetsByType: ColorSetDefinition[] = await getColorSetsByType(type);
    set({
      colorSetsByType,
    });
    return colorSetsByType;
  },
  setColorSet: async (colorSet: ColorSet, setActiveTabKey = true): Promise<void> => {
    if (setActiveTabKey) {
      const activeTabKey = !get().imageFile ? TabKey.Photo : TabKey.ColorPicker;
      await get().setActiveTabKey(activeTabKey);
    }
    set({
      colorSet,
      isColorMixerSetLoading: true,
      backgroundColor: PAPER_WHITE_HEX,
      similarColors: [],
    });
    await colorMixer.setColorSet(colorSet, PAPER_WHITE_HEX);
    set({
      isColorMixerSetLoading: false,
    });
    await get().setTargetColor(get().targetColor, get().samplingArea);
  },
  saveColorSet: async (
    user: User | null,
    colorSetDef: ColorSetDefinition,
    brands?: Map<number, ColorBrandDefinition>,
    colors?: Map<string, Map<number, ColorDefinition>>
  ): Promise<ColorSetDefinition> => {
    await saveColorSet(colorSetDef);
    set({
      colorSetsByType: [
        colorSetDef,
        ...get().colorSetsByType.filter(({id}: ColorSetDefinition) => id !== colorSetDef.id),
      ],
    });
    const colorSet: ColorSet | undefined = toColorSet(user, colorSetDef, brands, colors);
    if (colorSet) {
      await get().setColorSet(colorSet);
    }
    return colorSetDef;
  },
  deleteColorSet: async (idToDelete?: number): Promise<void> => {
    if (idToDelete) {
      await deleteColorSet(idToDelete);
      set({
        colorSetsByType: get().colorSetsByType.filter(
          ({id}: ColorSetDefinition) => id !== idToDelete
        ),
      });
    }
  },

  setImageFile: async (imageFile: ImageFile | null, setActiveTabKey = true): Promise<void> => {
    const prev: (ImageBitmap | null)[] = [
      get().originalImage,
      get().tonalImages,
      get().blurredImages,
      get().outlineImage,
      get().limitedPaletteImage,
    ].flat();
    if (setActiveTabKey && imageFile) {
      const activeTabKey = get().colorSet ? TabKey.ColorPicker : TabKey.ColorSet;
      await get().setActiveTabKey(activeTabKey);
    }
    const originalImageFile: File | null = imageFile ? imageFileToFile(imageFile) : null;
    set({
      imageFile,
      originalImageFile,
      isOriginalImageLoading: true,
      tonalImages: [],
      blurredImages: [],
      outlineImage: null,
      limitedPaletteImage: null,
      backgroundColor: PAPER_WHITE_HEX,
      targetColor: PAPER_WHITE_HEX,
      similarColors: [],
      paletteColorMixtures: await getColorMixtures(imageFile?.id),
    });
    const originalImage: ImageBitmap | null = originalImageFile
      ? await createScaledImageBitmap(originalImageFile, IMAGE_SIZE['2K'])
      : null;
    set({
      originalImage,
      isOriginalImageLoading: false,
    });
    prev.forEach(image => {
      image?.close();
    });
  },
  saveRecentImageFile: async (imageFile: ImageFile): Promise<void> => {
    await saveImageFile(imageFile);
    set(state => ({
      recentImageFiles: [
        imageFile,
        ...state.recentImageFiles.filter(({id}: ImageFile) => id !== imageFile.id),
      ],
    }));
    await get().setImageFile(imageFile);
  },
  deleteRecentImageFile: async ({id: idToDelete}: ImageFile): Promise<void> => {
    if (idToDelete) {
      await deleteImageFile(idToDelete);
      set(state => ({
        recentImageFiles: state.recentImageFiles.filter(({id}: ImageFile) => id !== idToDelete),
      }));
      if (get().imageFile?.id === idToDelete) {
        await get().setImageFile(null);
      }
    }
  },

  setBackgroundColor: async (backgroundColor: string | RgbTuple): Promise<void> => {
    set({
      isColorMixerBackgroundLoading: true,
      backgroundColor: Rgb.fromHexOrTuple(backgroundColor).toHex(),
      similarColors: [],
      isSimilarColorsLoading: true,
    });
    await colorMixer.setBackgroundColor(backgroundColor);
    set({
      isColorMixerBackgroundLoading: false,
      similarColors: await colorMixer.findSimilarColors(get().targetColor),
      isSimilarColorsLoading: false,
    });
  },
  setTargetColor: async (targetColor: string, samplingArea: SamplingArea | null): Promise<void> => {
    set({
      targetColor,
      samplingArea,
      colorPickerPipet: null,
      similarColors: [],
      isSimilarColorsLoading: true,
    });
    set({
      similarColors: await colorMixer.findSimilarColors(targetColor),
      isSimilarColorsLoading: false,
    });
  },
  setColorPickerPipet: (colorPickerPipet: SamplingArea | null): void => {
    set({colorPickerPipet});
  },

  saveToPalette: async (colorMixture: ColorMixture, linkToImage = true): Promise<void> => {
    const isNew = !colorMixture.id;
    if (isNew && linkToImage) {
      colorMixture.imageFileId = get().imageFile?.id;
      colorMixture.samplingArea = get().samplingArea;
    }
    await saveColorMixture(colorMixture);
    set(state => ({
      paletteColorMixtures: isNew
        ? [colorMixture, ...state.paletteColorMixtures]
        : state.paletteColorMixtures.map(
            (cm: ColorMixture): ColorMixture => (cm.id === colorMixture.id ? colorMixture : cm)
          ),
    }));
  },
  deleteFromPalette: async ({key: keyToDelete}: ColorMixture): Promise<void> => {
    const colorMixture = get().paletteColorMixtures.find(
      ({key}: ColorMixture) => key === keyToDelete
    );
    if (colorMixture?.id) {
      await deleteColorMixture(colorMixture.id);
      set(state => ({
        paletteColorMixtures: state.paletteColorMixtures.filter(
          ({id}: ColorMixture) => id !== colorMixture.id
        ),
      }));
    }
  },
  deleteAllFromPalette: async (typeToDelete: ColorType): Promise<void> => {
    for (const colorMixture of get().paletteColorMixtures) {
      if (colorMixture.type === typeToDelete && colorMixture.id) {
        await deleteColorMixture(colorMixture.id);
      }
    }
    set(state => {
      return {
        paletteColorMixtures: state.paletteColorMixtures.filter(
          ({type}: ColorMixture) => type !== typeToDelete
        ),
      };
    });
  },

  loadTonalImages: async (): Promise<void> => {
    const {originalImageFile, tonalImages} = get();
    if (!originalImageFile || tonalImages.length) {
      return;
    }
    set({
      isTonalImagesLoading: true,
    });
    const newTonalImages = await tonalValues.getTones(originalImageFile);
    set({
      tonalImages: newTonalImages,
      isTonalImagesLoading: false,
    });
  },

  loadBlurredImages: async (): Promise<void> => {
    const {originalImageFile, blurredImages} = get();
    if (!originalImageFile || blurredImages.length) {
      return;
    }
    set({
      isBlurredImagesLoading: true,
    });
    const newBlurredImages = await blur.getBlurred(originalImageFile);
    set({
      blurredImages: newBlurredImages,
      isBlurredImagesLoading: false,
    });
  },

  loadOutlineImage: async (): Promise<void> => {
    const {originalImageFile, outlineImage} = get();
    if (!originalImageFile || outlineImage) {
      return;
    }
    set({
      isOutlineImageLoading: true,
    });
    const newOutlineImage = await outline.getOutline(originalImageFile);
    set({
      outlineImage: newOutlineImage,
      isOutlineImageLoading: false,
    });
  },

  setLimitedColorSet: async (limitedColorSet: ColorSet): Promise<void> => {
    const {originalImageFile} = get();
    if (!originalImageFile) {
      return;
    }
    set({isLimitedPaletteImageLoading: true});
    const {preview: limitedPaletteImage} = await limitedPalette.getPreview(
      originalImageFile,
      limitedColorSet
    );
    set({
      limitedPaletteImage,
      isLimitedPaletteImageLoading: false,
    });
  },

  setImageFileToAdjust: async (imageFileToAdjust: File | null): Promise<void> => {
    const {unadjustedImage: prev} = get();
    let unadjustedImage: ImageBitmap | null = null;
    if (imageFileToAdjust) {
      unadjustedImage = await rgbChannelsPercentileCalculator.setImage(imageFileToAdjust);
    }
    set({
      imageFileToAdjust,
      unadjustedImage,
    });
    prev?.close();
  },
  adjustImageColor: async (
    whitePatchPercentile: number,
    adjustmentParams: AdjustmentParameters
  ): Promise<void> => {
    const {unadjustedImage, adjustedImage: prev} = get();
    if (!unadjustedImage) {
      return;
    }
    set({
      isAdjustedImageLoading: true,
    });
    const maxValues =
      await rgbChannelsPercentileCalculator.calculatePercentiles(whitePatchPercentile);
    const adjustedImage = colorCorrection.getAdjustedImage(
      unadjustedImage,
      maxValues,
      adjustmentParams
    );
    set({
      adjustedImage,
      isAdjustedImageLoading: false,
    });
    prev?.close();
  },

  setImageToRemoveBg: (imageToRemoveBg: File | null): void => {
    set({imageToRemoveBg});
  },

  updateTournament: (): void => {
    const {tournament} = get();
    const unfinishedGames = tournament.getUnfinishedGames();
    set({
      unfinishedGamesSize: unfinishedGames.length,
      nextGame: unfinishedGames[0],
      playersByRating: tournament.getPlayersByRating(),
    });
  },
  addPlayer: (player: Player<File>): void => {
    get().tournament.addPlayer(player);
    get().updateTournament();
  },
  setScore: (score: Score): void => {
    get().nextGame?.setScore(score);
    get().updateTournament();
  },
  newTournament: (): void => {
    set({tournament: new Tournament()});
    get().updateTournament();
  },

  loadCustomColorBrands: async (): Promise<void> => {
    set({
      customColorBrands: await getCustomColorBrands(),
    });
  },
  saveCustomColorBrand: async (
    brand: CustomColorBrandDefinition
  ): Promise<CustomColorBrandDefinition> => {
    await saveCustomColorBrand(brand);
    set({
      customColorBrands: [
        brand,
        ...get().customColorBrands.filter(({id}: CustomColorBrandDefinition) => id !== brand.id),
      ],
    });
    return brand;
  },
  deleteCustomColorBrand: async (idToDelete?: number): Promise<void> => {
    if (idToDelete) {
      await deleteCustomColorBrand(idToDelete);
      set({
        customColorBrands: get().customColorBrands.filter(
          ({id}: CustomColorBrandDefinition) => id !== idToDelete
        ),
      });
    }
  },

  initAppStore: async (user: User | null): Promise<void> => {
    set({
      isInitialStateLoading: true,
    });

    const {colorSet: importedColorSet, tabKey: importedTabKey} = importFromUrl();

    const appSettings: AppSettings | undefined = await getAppSettings();
    let activeTabKey: TabKey | undefined = importedTabKey ?? appSettings?.activeTabKey;
    if (importedColorSet) {
      activeTabKey = TabKey.ColorSet;
    }

    const imageFile: ImageFile | undefined = await getLastImageFile();
    if (imageFile) {
      await get().setImageFile(imageFile, false);
    }

    if (activeTabKey) {
      void get().setActiveTabKey(activeTabKey);
    }

    const latestColorSet: ColorSetDefinition | null =
      (!importedColorSet && (await getLastColorSet())) || null;
    const recentImageFiles: ImageFile[] = await getImageFiles();
    const paletteColorMixtures: ColorMixture[] = await getColorMixtures(imageFile?.id);

    set({
      importedColorSet,
      latestColorSet,
      recentImageFiles,
      paletteColorMixtures,
      isInitialStateLoading: false,
    });

    if (importedColorSet?.type) {
      void get().loadColorSetsByType(importedColorSet.type);
    }
    if (latestColorSet) {
      const {type, brands: brandIds} = latestColorSet;
      if (!type || !brandIds) {
        return;
      }
      void get().loadColorSetsByType(type);

      const brands = await fetchColorBrands(type);
      const brandAliases = brandIds
        .map((id: number): string | undefined => brands.get(id)?.alias)
        .filter((alias): alias is string => !!alias);
      const colors: Map<string, Map<number, ColorDefinition>> = await fetchColorsBulk(
        type,
        brandAliases
      );
      const colorSet = toColorSet(user, latestColorSet, brands, colors);
      if (colorSet) {
        void get().setColorSet(colorSet, false);
      }
    }
  },
}));
