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

import {afterAll, beforeAll, describe, expect, it, vi} from 'vitest';

import {ColorType, CUSTOM_COLOR_SET} from '@/services/color/types';
import {colorSetToUrl, parseUrl} from '@/services/url/url-parser';
import {TabKey} from '@/tabs';

beforeAll(() => {
  vi.stubGlobal('window', {location: {origin: 'https://app.example'}});
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe('color-set URLs', () => {
  it('round-trips custom color sets including compact SKU-based IDs', () => {
    const colorSet = {
      type: ColorType.WatercolorPaint,
      name: 'Travel palette',
      brands: [3, 10],
      standardColorSet: CUSTOM_COLOR_SET,
      colors: {
        3: [284600001, 284600035],
        10: [42],
      },
    };

    const url = colorSetToUrl(colorSet);

    expect(url).toBeDefined();
    expect(parseUrl(url!).colorSet).toEqual(colorSet);
  });

  it('does not create a URL for an incomplete color set', () => {
    expect(colorSetToUrl({type: ColorType.OilPaint})).toBeUndefined();
  });

  it.each([
    'https://app.example/?t=%25&b=1&c1=1',
    'https://app.example/?t=1&b=%25&c1=1',
    'https://app.example/?t=1&b=1&c1=%25',
    'https://app.example/?t=z&b=1&c1=1',
  ])('rejects malformed numeric parameters in %s', url => {
    expect(parseUrl(url)).toEqual({});
  });
});

describe('application URLs', () => {
  it('gives callback routes precedence over unrelated query parameters', () => {
    expect(
      parseUrl(
        `https://app.example/login/callback?completion_token=token&tab=${TabKey.ColorPicker}`
      )
    ).toEqual({loginCallback: {completionToken: 'token'}});
  });

  it('prefers a tab pathname over the tab query parameter', () => {
    expect(parseUrl(`https://app.example/${TabKey.Photo}?tab=${TabKey.ColorPicker}`)).toEqual({
      tabKey: TabKey.Photo,
    });
  });

  it('returns no action for unrelated URLs', () => {
    expect(parseUrl('https://app.example/unknown?value=1')).toEqual({});
  });
});
