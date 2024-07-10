/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import type {Remote} from 'comlink';
import {wrap} from 'comlink';
import {create} from 'zustand';

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
  type ImageFile,
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
  version as dbVersion,
} from '~/src/services/db';
import type {Blur, LimitedPalette, Outline, TonalValues} from '~/src/services/image';
import type {Game, Player, Score} from '~/src/services/rating';
import {Tournament} from '~/src/services/rating';
import type {UrlParsingResult} from '~/src/services/url';
import {parseUrl} from '~/src/services/url';
import {TabKey} from '~/src/types';
import {createScaledImageBitmap, IMAGE_SIZE} from '~/src/utils';

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

export type AppState = {
  dbVersion: number | null;
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
  tournament: Tournament<File>;
  unfinishedGamesSize: number;
  nextGame: Game<File> | null;
  playersByRating: Player<File>[];
};

export type AppActions = {
  setActiveTabKey: (activeTabKey: TabKey) => Promise<void>;
  loadColorSetsByType: (type: ColorType) => Promise<ColorSetDefinition[]>;
  setColorSet: (colorSet: ColorSet, setActiveTabKey?: boolean) => Promise<void>;
  saveColorSet: (
    colorSetDefinition: ColorSetDefinition,
    brands?: Map<number, ColorBrandDefinition>,
    colors?: Map<string, Map<number, ColorDefinition>>
  ) => Promise<ColorSetDefinition | undefined>;
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
  setLimitedColorSet: (limitedColorSet: ColorSet) => Promise<void>;
  updateTournament: () => void;
  addPlayer: (player: Player<File>) => void;
  setScore: (score: Score) => void;
  newTournament: () => void;
};

export const useAppStore = create<AppState & AppActions>((set, get) => ({
  dbVersion: null,
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
  tournament: new Tournament(),
  unfinishedGamesSize: 0,
  nextGame: null,
  playersByRating: [],
  setActiveTabKey: async (activeTabKey: TabKey): Promise<void> => {
    await saveAppSettings({activeTabKey});
    set({activeTabKey});
    console.log(activeTabKey);
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
    colorSetDef: ColorSetDefinition,
    brands?: Map<number, ColorBrandDefinition>,
    colors?: Map<string, Map<number, ColorDefinition>>
  ): Promise<ColorSetDefinition | undefined> => {
    const savedColorSetDef = await saveColorSet(colorSetDef);
    set({
      colorSetsByType: [
        savedColorSetDef,
        ...get().colorSetsByType.filter(({id}: ColorSetDefinition) => id !== savedColorSetDef.id),
      ],
    });
    const colorSet: ColorSet | undefined = toColorSet(savedColorSetDef, brands, colors);
    if (colorSet) {
      await get().setColorSet(colorSet);
    }
    return savedColorSetDef;
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
      const activeTabKey = !get().colorSet ? TabKey.ColorSet : TabKey.ColorPicker;
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
      const {file} = imageFile;
      set({
        originalImage: await createScaledImageBitmap(file, IMAGE_SIZE['2K']),
        isOriginalImageLoading: false,
      });
      set({
        tonalImages: (await tonalValues.getTones(file)).tones,
        isTonalImagesLoading: false,
      });
      set({
        blurredImages: (await blur.getBlurred(file)).blurred,
        isBlurredImagesLoading: false,
      });
      set({
        outlineImage: (await outline.getOutline(file)).outline,
        isOutlineImageLoading: false,
      });
    } else {
      set({
        isOriginalImageLoading: false,
        isTonalImagesLoading: false,
        isBlurredImagesLoading: false,
        isOutlineImageLoading: false,
      });
    }

    for (const image of prev) {
      image?.close();
    }
  },
  saveRecentImageFile: async (imageFile: ImageFile): Promise<void> => {
    const savedImageFile: ImageFile = await saveImageFile({...imageFile, date: new Date()});
    set(state => ({
      recentImageFiles: [
        savedImageFile,
        ...state.recentImageFiles.filter(({id}: ImageFile) => id !== savedImageFile.id),
      ],
    }));
    await get().setImageFile(savedImageFile);
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
  setColorPickerPipet: (colorPickerPipet: SamplingArea | null): void => set({colorPickerPipet}),
  saveToPalette: async (colorMixture: ColorMixture, linkToImage = true): Promise<void> => {
    const isNew: boolean = !colorMixture.id;
    const savedColorMixture: ColorMixture = await saveColorMixture({
      ...colorMixture,
      ...(isNew &&
        linkToImage && {
          imageFileId: get().imageFile?.id,
          samplingArea: get().samplingArea,
        }),
      ...(isNew && {
        date: new Date(),
      }),
    });
    set(state => ({
      paletteColorMixtures: state.paletteColorMixtures
        ? isNew
          ? [savedColorMixture, ...state.paletteColorMixtures]
          : state.paletteColorMixtures.map(
              (colorMixture: ColorMixture): ColorMixture =>
                colorMixture.id === savedColorMixture.id ? savedColorMixture : colorMixture
            )
        : [savedColorMixture],
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
    const {imageFile} = get();
    if (!imageFile) {
      return;
    }
    set({isLimitedPaletteImageLoading: true});
    set({
      limitedPaletteImage: (await limitedPalette.getPreview(imageFile?.file, limitedColorSet))
        .preview,
      isLimitedPaletteImageLoading: false,
    });
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
  newTournament: () => {
    set({tournament: new Tournament()});
    get().updateTournament();
  },
}));

function importFromUrl(): UrlParsingResult {
  const importedFromUrl: UrlParsingResult = parseUrl(window.location.toString());
  const {colorSet, tabKey} = importedFromUrl;
  if (colorSet || tabKey) {
    history.pushState({}, '', '/');
  }
  return importedFromUrl;
}

async function getAppState(): Promise<void> {
  const {colorSet: importedColorSet, tabKey: importedTabKey} = importFromUrl();

  const appSettings = await getAppSettings();
  let activeTabKey: TabKey | undefined = importedTabKey ?? appSettings.activeTabKey;

  const latestColorSet: ColorSetDefinition | undefined = await getLastColorSet();

  useAppStore.setState({
    isInitialStateLoading: true,
    dbVersion: await dbVersion(),
    importedColorSet,
    latestColorSet,
  });

  if (importedColorSet) {
    activeTabKey = TabKey.ColorSet;
  }

  if (latestColorSet) {
    const {type, brands: brandIds} = latestColorSet;
    if (type) {
      void useAppStore.getState().loadColorSetsByType(type);

      const brands = await fetchColorBrands(type);
      const brandAliases = brandIds
        .map((id: number): string | undefined => brands.get(id)?.alias)
        .filter((alias): alias is string => !!alias);
      const colors: Map<string, Map<number, ColorDefinition>> = await fetchColorsBulk(
        type,
        brandAliases
      );
      const colorSet = toColorSet(latestColorSet, brands, colors);
      if (colorSet) {
        void useAppStore.getState().setColorSet(colorSet, false);
      }
    }
  }

  const recentImageFiles: ImageFile[] = await getImageFiles();
  const imageFile: ImageFile | undefined = await getLastImageFile();
  const paletteColorMixtures: ColorMixture[] = await getColorMixtures(imageFile?.id);

  useAppStore.setState({
    recentImageFiles,
    paletteColorMixtures,
    isInitialStateLoading: false,
  });

  if (imageFile) {
    void useAppStore.getState().setImageFile(imageFile, false);
  }

  if (activeTabKey) {
    void useAppStore.getState().setActiveTabKey(activeTabKey);
  }
}

void getAppState();
