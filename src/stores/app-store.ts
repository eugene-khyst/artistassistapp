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
  ColorSetDefinition,
  ColorType,
  SamplingArea,
  SimilarColor,
} from '~/src/services/color';
import {
  type ColorMixture,
  type ColorSet,
  compareColorSetsByDate,
  fetchColorBrands,
  fetchColorsBulk,
  PAPER_WHITE_HEX,
  toColorSet,
} from '~/src/services/color';
import {Rgb, type RgbTuple} from '~/src/services/color/space';
import {
  deleteColorMixture,
  deleteColorSet,
  getColorMixtures,
  getColorSetsByType,
  getLastColorSet,
  saveColorMixture,
  saveColorSet,
} from '~/src/services/db';
import {
  deleteImageFile,
  getAppSettings,
  getImageFiles,
  getLastImageFile,
  saveAppSettings,
  saveImageFile,
} from '~/src/services/db';
import type {
  Blur,
  ColorCorrection,
  ImageFile,
  LimitedPalette,
  Outline,
  TonalValues,
} from '~/src/services/image';
import type {Game, Player, Score} from '~/src/services/rating';
import {Tournament} from '~/src/services/rating';
import type {AppSettings} from '~/src/services/settings';
import {importFromUrl} from '~/src/services/url';
import {TabKey} from '~/src/tabs';
import {arrayBufferToBlob, createScaledImageBitmap, IMAGE_SIZE} from '~/src/utils';

const colorMixer: Remote<ColorMixer> = wrap(
  new Worker(new URL('../services/color/worker/color-mixer-worker.ts', import.meta.url), {
    type: 'module',
  })
);

const tonalValues: Remote<TonalValues> = wrap(
  new Worker(new URL('../services/image/worker/tonal-values-worker.ts', import.meta.url), {
    type: 'module',
  })
);

const blur: Remote<Blur> = wrap(
  new Worker(new URL('../services/image/worker/blur-worker.ts', import.meta.url), {
    type: 'module',
  })
);

const outline: Remote<Outline> = wrap(
  new Worker(new URL('../services/image/worker/outline-worker.ts', import.meta.url), {
    type: 'module',
  })
);

const limitedPalette: Remote<LimitedPalette> = wrap(
  new Worker(new URL('../services/image/worker/limited-palette-worker.ts', import.meta.url), {
    type: 'module',
  })
);

const colorCorrection: Remote<ColorCorrection> = wrap(
  new Worker(new URL('../services/image/worker/color-correction-worker.ts', import.meta.url), {
    type: 'module',
  })
);

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

  imageToAdjust: File | null;
  unadjustedImage: ImageBitmap | null;
  adjustedImage: ImageBitmap | null;
  isAdjustedImageLoading: boolean;

  imageToRemoveBg: File | null;

  tournament: Tournament<File>;
  unfinishedGamesSize: number;
  nextGame: Game<File> | null;
  playersByRating: Player<File>[];
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
  getImageBlob: () => Blob | undefined;
  saveRecentImageFile: (imageFile: ImageFile) => Promise<void>;
  deleteRecentImageFile: (imageFile: ImageFile) => Promise<void>;

  setBackgroundColor: (backgroundColor: string | RgbTuple) => Promise<void>;
  setTargetColor: (color: string, samplingArea: SamplingArea | null) => Promise<void>;
  setColorPickerPipet: (colorPickerPipet: SamplingArea | null) => void;

  saveToPalette: (colorMixture: ColorMixture, linkToImage?: boolean) => Promise<void>;
  deleteFromPalette: (colorMixture: ColorMixture) => Promise<void>;
  deleteAllFromPalette: (type: ColorType) => Promise<void>;

  setLimitedColorSet: (limitedColorSet: ColorSet) => Promise<void>;

  setImageToAdjust: (imageToAdjust: File | null) => Promise<void>;
  adjustImageColor: (whitePatchPercentile: number, saturation: number) => Promise<void>;

  setImageToRemoveBg: (imageToRemoveBg: File | null) => void;

  updateTournament: () => void;

  addPlayer: (player: Player<File>) => void;
  setScore: (score: Score) => void;
  newTournament: () => void;

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

  imageToAdjust: null,
  unadjustedImage: null,
  adjustedImage: null,
  isAdjustedImageLoading: false,

  imageToRemoveBg: null,

  tournament: new Tournament(),
  unfinishedGamesSize: 0,
  nextGame: null,
  playersByRating: [],

  setActiveTabKey: async (activeTabKey: TabKey): Promise<void> => {
    await saveAppSettings({activeTabKey});
    set({activeTabKey});
  },

  loadColorSetsByType: async (type: ColorType): Promise<ColorSetDefinition[]> => {
    const colorSetsByType: ColorSetDefinition[] = (await getColorSetsByType(type))
      .sort(compareColorSetsByDate)
      .reverse();
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
    set({
      imageFile,
      originalImage: null,
      isOriginalImageLoading: true,
      tonalImages: [],
      isTonalImagesLoading: true,
      blurredImages: [],
      isBlurredImagesLoading: true,
      outlineImage: null,
      isOutlineImageLoading: true,
      limitedPaletteImage: null,
      backgroundColor: PAPER_WHITE_HEX,
      targetColor: PAPER_WHITE_HEX,
      similarColors: [],
      paletteColorMixtures: await getColorMixtures(imageFile?.id),
    });
    if (imageFile) {
      const {buffer, type} = imageFile;
      const blob = arrayBufferToBlob(buffer, type);
      await Promise.all([
        (async () => {
          set({
            originalImage: await createScaledImageBitmap(blob, IMAGE_SIZE['2K']),
            isOriginalImageLoading: false,
          });
        })(),
        (async () => {
          set({
            tonalImages: (await tonalValues.getTones(blob)).tones,
            isTonalImagesLoading: false,
          });
        })(),
        (async () => {
          set({
            blurredImages: (await blur.getBlurred(blob)).blurred,
            isBlurredImagesLoading: false,
          });
        })(),
        (async () => {
          set({
            outlineImage: (await outline.getOutline(blob)).outline,
            isOutlineImageLoading: false,
          });
        })(),
      ]);
    } else {
      set({
        isOriginalImageLoading: false,
        isTonalImagesLoading: false,
        isBlurredImagesLoading: false,
        isOutlineImageLoading: false,
      });
    }
    prev.forEach(image => {
      image?.close();
    });
  },
  getImageBlob: (): Blob | undefined => {
    const {imageFile} = get();
    if (!imageFile) {
      return;
    }
    const {buffer, type} = imageFile;
    return arrayBufferToBlob(buffer, type);
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

  setLimitedColorSet: async (limitedColorSet: ColorSet): Promise<void> => {
    const blob = get().getImageBlob();
    if (!blob) {
      return;
    }
    set({isLimitedPaletteImageLoading: true});
    set({
      limitedPaletteImage: (await limitedPalette.getPreview(blob, limitedColorSet)).preview,
      isLimitedPaletteImageLoading: false,
    });
  },

  setImageToAdjust: async (imageToAdjust: File | null): Promise<void> => {
    const {unadjustedImage: prev} = get();
    let unadjustedImage: ImageBitmap | null = null;
    if (imageToAdjust) {
      unadjustedImage = await colorCorrection.setImage(imageToAdjust);
    }
    set({
      imageToAdjust: imageToAdjust,
      unadjustedImage,
    });
    prev?.close();
  },
  adjustImageColor: async (whitePatchPercentile: number, saturation: number): Promise<void> => {
    const {imageToAdjust, adjustedImage: prev} = get();
    if (!imageToAdjust) {
      return;
    }
    set({
      isAdjustedImageLoading: true,
    });
    const {adjustedImage} = await colorCorrection.getAdjustedImage(
      whitePatchPercentile / 100,
      saturation / 100
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
    if (activeTabKey) {
      void get().setActiveTabKey(activeTabKey);
    }

    const latestColorSet: ColorSetDefinition | undefined = await getLastColorSet();
    const recentImageFiles: ImageFile[] = await getImageFiles();
    const imageFile: ImageFile | undefined = await getLastImageFile();
    const paletteColorMixtures: ColorMixture[] = await getColorMixtures(imageFile?.id);

    set({
      importedColorSet,
      latestColorSet,
      recentImageFiles,
      paletteColorMixtures,
      isInitialStateLoading: false,
    });

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

    if (imageFile) {
      void get().setImageFile(imageFile, false);
    }
  },
}));
