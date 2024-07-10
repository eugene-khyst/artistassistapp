/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import type {LaunchParams} from '~/src/pwa';
import {useAppStore} from '~/src/stores/app-store';

export function registerFileHandler() {
  if ('launchQueue' in window) {
    window.launchQueue.setConsumer(async (launchParams: LaunchParams) => {
      for (const fileHandle of launchParams.files) {
        const file: File = await fileHandle.getFile();
        await useAppStore.getState().setImportedImageFile(file);
      }
    });
  }
}
