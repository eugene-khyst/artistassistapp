/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import type {Remote} from 'comlink';
import {wrap} from 'comlink';
import {create} from 'zustand';

import type {
  ColorBrand,
  ColorMixer,
  ColorMixturePartDefinition,
  ColorType,
  SamplingArea,
  SimilarColor,
  UrlParsingResult,
} from '~/src/services/color';
import {
  type Color,
  type ColorMixture,
  type ColorSet,
  createColorMixture,
  fetchColorsBulk,
  PAPER_WHITE_HEX,
  parseUrl,
} from '~/src/services/color';
import {Rgb, type RgbTuple} from '~/src/services/color/space';
import {
  deleteColorMixture,
  getColorMixtures,
  type ImageFile,
  saveColorMixture,
} from '~/src/services/db';
import {deleteImageFile, getImageFiles, saveImageFile} from '~/src/services/db/image-file-db';
import type {Blur, LimitedPalette, Outline, TonalValues} from '~/src/services/image';
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
  activeTabKey: TabKey;
  colorSet: ColorSet | null;
  imageFile: ImageFile | null;
  recentImageFiles: ImageFile[];
  isRecentImageFilesLoading: boolean;
  originalImage: ImageBitmap | null;
  isOriginalImageLoading: boolean;
  isColorMixerSetLoading: boolean;
  isColorMixerBackgroundLoading: boolean;
  backgroundColor: string;
  targetColor: string;
  samplingArea: SamplingArea | null;
  colorPickerPipet: SamplingArea | null;
  similarColors: SimilarColor[];
  isSimilarColorsLoading: boolean;
  paletteColorMixtures: ColorMixture[];
  isPaletteColorMixturesLoading: boolean;
  tonalImages: ImageBitmap[];
  isTonalImagesLoading: boolean;
  blurredImages: ImageBitmap[];
  isBlurredImagesLoading: boolean;
  outlineImage: ImageBitmap | null;
  isOutlineImageLoading: boolean;
  limitedPaletteImage: ImageBitmap | null;
  isLimitedPaletteImageLoading: boolean;
};

export type AppActions = {
  setActiveTabKey: (activeTabKey: TabKey) => void;
  setColorSet: (colorSet: ColorSet) => Promise<void>;
  setImageFile: (imageFile: ImageFile | null) => Promise<void>;
  saveRecentImageFile: (imageFile: ImageFile) => Promise<void>;
  deleteRecentImageFile: (imageFile: ImageFile) => Promise<void>;
  setBackgroundColor: (backgroundColor: string | RgbTuple) => Promise<void>;
  setTargetColor: (color: string, samplingArea: SamplingArea | null) => Promise<void>;
  setColorPickerPipet: (colorPickerPipet: SamplingArea | null) => void;
  saveToPalette: (colorMixture: ColorMixture, linkToImage?: boolean) => Promise<void>;
  deleteFromPalette: (colorMixture: ColorMixture) => void;
  deleteAllFromPalette: (type: ColorType) => void;
  setLimitedColorSet: (limitedColorSet: ColorSet) => Promise<void>;
};

export const useAppStore = create<AppState & AppActions>((set, get) => ({
  activeTabKey: TabKey.ColorSet,
  colorSet: null,
  imageFile: null,
  recentImageFiles: [],
  isRecentImageFilesLoading: false,
  originalImage: null,
  isOriginalImageLoading: false,
  isColorMixerSetLoading: false,
  isColorMixerBackgroundLoading: false,
  backgroundColor: PAPER_WHITE_HEX,
  targetColor: PAPER_WHITE_HEX,
  samplingArea: null,
  colorPickerPipet: null,
  similarColors: [],
  isSimilarColorsLoading: false,
  paletteColorMixtures: [],
  isPaletteColorMixturesLoading: false,
  tonalImages: [],
  isTonalImagesLoading: false,
  blurredImages: [],
  isBlurredImagesLoading: false,
  outlineImage: null,
  isOutlineImageLoading: false,
  limitedPaletteImage: null,
  isLimitedPaletteImageLoading: false,
  setActiveTabKey: (activeTabKey: TabKey): void => set({activeTabKey}),
  setColorSet: async (colorSet: ColorSet): Promise<void> => {
    set({
      activeTabKey: !get().imageFile ? TabKey.Photo : TabKey.ColorPicker,
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
  setImageFile: async (imageFile: ImageFile | null): Promise<void> => {
    const prev: (ImageBitmap | null)[] = [
      get().originalImage,
      get().tonalImages,
      get().blurredImages,
      get().outlineImage,
      get().limitedPaletteImage,
    ].flat();
    set({
      ...(imageFile && {activeTabKey: !get().colorSet ? TabKey.ColorSet : TabKey.ColorPicker}),
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
      void deleteImageFile(idToDelete);
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
        timestamp: Date.now(),
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
  deleteFromPalette: ({key: keyToDelete}: ColorMixture): void => {
    const colorMixture = get().paletteColorMixtures.find(
      ({key}: ColorMixture) => key === keyToDelete
    );
    if (colorMixture?.id) {
      void deleteColorMixture(colorMixture.id);
      set(state => ({
        paletteColorMixtures: state.paletteColorMixtures.filter(
          ({id}: ColorMixture) => id !== colorMixture.id
        ),
      }));
    }
  },
  deleteAllFromPalette: (typeToDelete: ColorType): void => {
    for (const colorMixture of get().paletteColorMixtures) {
      if (colorMixture.type === typeToDelete && colorMixture.id) {
        void deleteColorMixture(colorMixture.id);
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
}));

function importFromUrl(): UrlParsingResult {
  const importedFromUrl: UrlParsingResult = parseUrl(window.location.toString());
  const {colorSet, colorMixture} = importedFromUrl;
  if (colorSet || colorMixture) {
    history.pushState({}, '', '/');
  }
  return importedFromUrl;
}

export const importedFromUrl: UrlParsingResult = importFromUrl();

async function getAppState(): Promise<void> {
  useAppStore.setState({
    isRecentImageFilesLoading: true,
    isPaletteColorMixturesLoading: true,
  });

  useAppStore.setState({
    recentImageFiles: await getImageFiles(),
    isRecentImageFilesLoading: false,
  });

  let activeTabKey: TabKey | null = null;
  const {colorMixture: importedColorMixture} = importedFromUrl;
  if (importedColorMixture) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('Importing color mixture', importedColorMixture);
    }
    const {type, parts} = importedColorMixture;
    const brands = parts.map(({brand}: ColorMixturePartDefinition): ColorBrand => brand);
    const colors: Map<ColorBrand, Map<number, Color>> = await fetchColorsBulk(type, brands);
    let colorMixture: ColorMixture | null = createColorMixture(importedColorMixture, colors);
    if (colorMixture) {
      colorMixture = await saveColorMixture({...colorMixture, timestamp: Date.now()});
      activeTabKey = TabKey.Palette;
    }
  }
  const paletteColorMixtures: ColorMixture[] = await getColorMixtures();
  useAppStore.setState({
    ...(activeTabKey && {activeTabKey}),
    paletteColorMixtures,
    isPaletteColorMixturesLoading: false,
  });
}

void getAppState();
