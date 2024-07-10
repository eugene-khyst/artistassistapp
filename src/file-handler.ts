/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {saveImageFile} from '~/src/services/db';

export function registerFileHandler() {
  if ('launchQueue' in window) {
    window.launchQueue.setConsumer(async launchParams => {
      for (const fileHandle of launchParams.files) {
        const file: File = await fileHandle.getFile();
        await saveImageFile({
          file,
          date: new Date(),
        });
      }
    });
  }
}
