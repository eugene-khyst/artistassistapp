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

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {getCollapseLevel} from '@/hooks/useCollapseLevel';

const ACTIONS = [100, 80, 60];
const OVERFLOW_BUTTON = 32;
const AFTER = 120;

function toolbar(width: number, childWidths: number[]): HTMLElement {
  return {
    getBoundingClientRect: () => ({width}),
    children: childWidths.map(childWidth => ({getBoundingClientRect: () => ({width: childWidth})})),
  } as unknown as HTMLElement;
}

function collapseLevel(width: number, after: number[] = [AFTER]): number {
  return getCollapseLevel(toolbar(width, [...ACTIONS, OVERFLOW_BUTTON, ...after]), ACTIONS.length);
}

beforeEach(() => {
  vi.stubGlobal('getComputedStyle', () => ({columnGap: '8px'}));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getCollapseLevel', () => {
  it('collapses nothing while every action and the content after them fit', () => {
    expect(collapseLevel(100 + 80 + 60 + 2 * 8 + 8 + 120)).toBe(0);
  });

  it('collapses actions one at a time from the right, making room for the overflow button', () => {
    expect(collapseLevel(100 + 80 + 60 + 2 * 8 + 8 + 120 - 1)).toBe(1);
    expect(collapseLevel(100 + 8 + 80 + 8 + 32 + 8 + 120)).toBe(1);
    expect(collapseLevel(100 + 8 + 80 + 8 + 32 + 8 + 120 - 1)).toBe(2);
    expect(collapseLevel(100 + 8 + 32 + 8 + 120)).toBe(2);
    expect(collapseLevel(100 + 8 + 32 + 8 + 120 - 1)).toBe(3);
  });

  it('collapses every action when even the first one does not fit', () => {
    expect(collapseLevel(32)).toBe(3);
  });

  it('leaves more room for the actions when there is no content after them', () => {
    expect(collapseLevel(100 + 80 + 60 + 2 * 8, [])).toBe(0);
    expect(collapseLevel(100 + 80 + 60 + 2 * 8 - 1, [])).toBe(1);
  });
});
