/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import type {LaunchParams} from '~/src/pwa';
import {saveAppSettings, saveImageFile} from '~/src/services/db';
import {TabKey} from '~/src/types';

export function registerFileHandler() {
  if ('launchQueue' in window) {
    window.launchQueue.setConsumer(async (launchParams: LaunchParams) => {
      for (const fileHandle of launchParams.files) {
        const file: File = await fileHandle.getFile();
        await saveImageFile({
          file,
          date: new Date(),
        });
        void saveAppSettings({
          activeTabKey: TabKey.Photo,
        });
      }
    });
  }
}
