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

import {describe, expect, it, vi} from 'vitest';

import {ImageDependencyRegistry} from '@/stores/registry/image-dependency-registry';

describe('ImageDependencyRegistry', () => {
  it('aborts every dependency before clearing any dependency', () => {
    const calls: string[] = [];
    const registry = new ImageDependencyRegistry();
    registry.register({
      abort: () => calls.push('abort-first'),
      clear: () => calls.push('clear-first'),
    });
    registry.register({
      abort: () => calls.push('abort-second'),
      clear: () => calls.push('clear-second'),
    });

    registry.abortAndClear();

    expect(calls).toEqual(['abort-first', 'abort-second', 'clear-first', 'clear-second']);
  });

  it('can abort without clearing dependencies', () => {
    const abort = vi.fn();
    const clear = vi.fn();
    const registry = new ImageDependencyRegistry();
    registry.register({abort, clear});

    registry.abort();

    expect(abort).toHaveBeenCalledOnce();
    expect(clear).not.toHaveBeenCalled();
  });
});
