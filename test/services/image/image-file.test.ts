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

import {describe, expect, it} from 'vitest';

import {ImageUnreadableError} from '@/services/image/errors';
import type {ImageBlob} from '@/services/image/image-file';
import {readStoredImageBytes} from '@/services/image/image-file';
import {digestArrayBuffer} from '@/utils/digest';

function bytes(value: string): ArrayBuffer {
  return new TextEncoder().encode(value).buffer;
}

async function expectUnreadable(promise: Promise<unknown>): Promise<ImageUnreadableError> {
  try {
    await promise;
    throw new Error('Expected ImageUnreadableError');
  } catch (error) {
    if (!(error instanceof ImageUnreadableError)) {
      throw error;
    }
    return error;
  }
}

describe('readStoredImageBytes', () => {
  it('returns bytes only when the full content matches the digest', async () => {
    const content = bytes('healthy photo');
    const digest = await digestArrayBuffer(content);
    const result = await readStoredImageBytes(
      {digest, name: 'photo.png'},
      {digest, blob: new Blob([content])}
    );

    expect(new Uint8Array(result)).toEqual(new Uint8Array(content));
  });

  it('reports a missing blob record as unreadable', async () => {
    const error = await expectUnreadable(
      readStoredImageBytes({digest: 'missing', name: 'missing.png'}, undefined)
    );

    expect(error.digest).toBe('missing');
    expect(error.imageName).toBe('missing.png');
  });

  it('reports bytes stored under the wrong digest as unreadable', async () => {
    const expected = bytes('expected photo');
    const digest = await digestArrayBuffer(expected);
    const error = await expectUnreadable(
      readStoredImageBytes({digest}, {digest, blob: new Blob([bytes('different photo')])})
    );

    expect(error.digest).toBe(digest);
  });

  it('preserves the underlying full-read failure as the cause', async () => {
    const cause = new Error('Blob backing file is missing');
    const imageBlob: ImageBlob = {
      digest: 'unreadable',
      blob: {
        arrayBuffer: () => Promise.reject(cause),
      } as Blob,
    };
    const error = await expectUnreadable(
      readStoredImageBytes({digest: imageBlob.digest}, imageBlob)
    );

    expect(error.cause).toBe(cause);
  });
});
