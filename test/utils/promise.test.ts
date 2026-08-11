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

import {afterEach, describe, expect, it} from 'vitest';

import {anySignal} from '@/utils/promise';

const nativeAny: unknown = AbortSignal.any;

function defineAny(value: unknown): void {
  Object.defineProperty(AbortSignal, 'any', {value, configurable: true, writable: true});
}

function withoutNativeAny(): void {
  defineAny(undefined);
}

afterEach(() => {
  defineAny(nativeAny);
});

describe.each([
  ['native', () => undefined],
  ['fallback', withoutNativeAny],
])('anySignal (%s)', (_name, prepare) => {
  it('aborts with the reason of the first signal to abort', () => {
    prepare();
    const first = new AbortController();
    const second = new AbortController();

    const combined = anySignal([first.signal, second.signal]);
    expect(combined.aborted).toBe(false);

    second.abort(new Error('second'));
    first.abort(new Error('first'));

    expect(combined.aborted).toBe(true);
    expect(combined.reason).toEqual(new Error('second'));
  });

  it('is already aborted when a source signal is aborted', () => {
    prepare();
    const controller = new AbortController();
    controller.abort(new Error('already'));

    const combined = anySignal([controller.signal, new AbortController().signal]);

    expect(combined.aborted).toBe(true);
    expect(combined.reason).toEqual(new Error('already'));
  });
});
