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

import type {LaunchParams} from '~/src/pwa';
import {saveAppSettings, saveImageFile} from '~/src/services/db';
import {fileToImageFile} from '~/src/services/image';
import {TabKey} from '~/src/tabs';

export function registerFileHandler() {
  if ('launchQueue' in window) {
    window.launchQueue.setConsumer(async (launchParams: LaunchParams) => {
      for (const fileHandle of launchParams.files) {
        const file: File = await fileHandle.getFile();
        await saveImageFile(await fileToImageFile(file));
        void saveAppSettings({
          activeTabKey: TabKey.Photo,
        });
      }
    });
  }
}
