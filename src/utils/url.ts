/**
 * ArtistAssistApp
 * Copyright (C) 2023-2025  Eugene Khyst
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

export const EXTENSION_TO_MIME_TYPE: Record<string, string> = {
  js: 'application/javascript',
  css: 'text/css',
  html: 'text/html',
  webp: 'image/webp',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  json: 'application/json',
};

export function getUrlString(requestInfo: RequestInfo | URL): string {
  if (requestInfo instanceof URL) {
    return requestInfo.href;
  } else if (requestInfo instanceof Request) {
    return requestInfo.url;
  } else {
    return requestInfo;
  }
}

export function splitUrl(url: URL): [string, string] {
  const pathSegments = url.pathname.split('/');
  const filename = pathSegments.pop()!;
  const base = `${url.origin}${pathSegments.join('/')}/`;
  return [base, filename];
}

export function getFileExtension(url: string): string | undefined {
  return /\.([^./?#]+)(?:[?#]|$)/.exec(url)?.[1]?.toLowerCase();
}
