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

import {expose, releaseProxy, wrap} from 'comlink';
import {describe, expect, it} from 'vitest';

import {isWebGpuInferenceError, WebGpuInferenceError} from '@/services/ml/errors';

describe('WebGpuInferenceError', () => {
  it('preserves the original message and cause', () => {
    const cause = new Error('device lost');
    const error = new WebGpuInferenceError(cause);

    expect(error).toBeInstanceOf(WebGpuInferenceError);
    expect(error.message).toBe(cause.message);
    expect(error.cause).toBe(cause);
    expect(isWebGpuInferenceError(error)).toBe(true);
  });

  it('remains recognizable after Comlink transfers it', async () => {
    const {port1, port2} = new MessageChannel();
    const api = {
      run: (): void => {
        throw new WebGpuInferenceError(new Error('device lost'));
      },
    };
    expose(api, port1);
    const remote = wrap<typeof api>(port2);
    try {
      const error = await remote.run().catch((error: unknown) => error);

      expect(error).not.toBeInstanceOf(WebGpuInferenceError);
      expect(isWebGpuInferenceError(error)).toBe(true);
      expect(error).toMatchObject({message: 'device lost'});
    } finally {
      remote[releaseProxy]();
      port1.close();
      port2.close();
    }
  });

  it.each([new Error('device lost'), new TypeError('fetch failed'), null, 'WebGpuInferenceError'])(
    'does not classify unrelated errors: %s',
    error => {
      expect(isWebGpuInferenceError(error)).toBe(false);
    }
  );
});
