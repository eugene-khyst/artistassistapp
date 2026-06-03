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

import {Mime} from 'mime/lite';
import standardTypes from 'mime/types/standard.js';
import {MIMEType} from 'whatwg-mimetype';

const customTypes = {
  'application/octet-stream': ['onnx'],
};

const mime = new Mime(standardTypes).define(customTypes, true);

type Result = {ok: true; expected: string | null} | {ok: false; expected: string};

function matchesMimeType(actual: MIMEType, accepted: MIMEType): boolean {
  return (
    (accepted.type === '*' || actual.type === accepted.type) &&
    (accepted.subtype === '*' || actual.subtype === accepted.subtype)
  );
}

export function checkMimeType(
  extension: string | null | undefined,
  contentType: string | null | undefined
): Result {
  const expected: string | null = extension ? mime.getType(extension) : null;
  const actual: MIMEType | null = contentType ? MIMEType.parse(contentType) : null;
  if (!expected || !actual) {
    return {ok: true, expected};
  }
  return {
    ok: actual.essence === expected || (expected === 'text/javascript' && actual.isJavaScript()),
    expected,
  };
}

export function findAcceptedMimeType(
  contentTypes: readonly string[],
  accept: string[]
): string | undefined {
  return contentTypes.find(contentType => {
    const actual: MIMEType | null = MIMEType.parse(contentType);
    if (!actual) {
      return false;
    }
    return accept.some(acceptedType => {
      const accepted: MIMEType | null = MIMEType.parse(acceptedType);
      if (!accepted) {
        return false;
      }
      return matchesMimeType(actual, accepted);
    });
  });
}
