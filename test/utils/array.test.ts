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

import {containsSequence} from '@/utils/array';

describe('containsSequence', () => {
  it('compares mapped values in order', () => {
    const actual = [{digest: 'first'}, {digest: 'second'}];

    expect(containsSequence(actual, ['first', 'second'], ({digest}) => digest)).toBe(true);
    expect(containsSequence(actual, ['second', 'first'], ({digest}) => digest)).toBe(false);
  });
});
