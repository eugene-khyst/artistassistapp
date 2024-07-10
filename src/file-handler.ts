/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {useAppStore} from '~/src/stores/app-store';

export function registerFileHandler() {
  if ('launchQueue' in window) {
    window.launchQueue.setConsumer(async launchParams => {
      for (const fileHandle of launchParams.files) {
        const file: File = await fileHandle.getFile();
        await useAppStore.getState().saveRecentImageFile({
          file,
          date: new Date(),
        });
      }
    });
  }
}
