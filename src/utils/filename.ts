/**
 * ArtistAssistApp
 * Copyright (C) 2023-2026  Eugene Khyst
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

interface NamedFile {
  name?: string;
}

export function getFileExtension(fileName: string): string | undefined {
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot <= 0 || lastDot === fileName.length - 1) {
    return;
  }
  return fileName.slice(lastDot + 1).toLowerCase();
}

export function addExtensionIfMissing(fileName: string, extension: string): string {
  return getFileExtension(fileName) ? fileName : `${fileName}.${extension}`;
}

export function getFilename(
  file: NamedFile | null | undefined,
  suffix?: string
): string | undefined {
  if (!file?.name) {
    return;
  }
  const lastDot = file.name.lastIndexOf('.');
  const originalName = lastDot > 0 ? file.name.slice(0, lastDot) : file.name;
  return suffix ? `${originalName}-${suffix}` : originalName;
}
