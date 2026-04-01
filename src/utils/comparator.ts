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

export type Comparator<T> = (a: T, b: T) => number;

export const by =
  <T, P>(fn: (item: T) => P | null | undefined, comparator: Comparator<P>): Comparator<T> =>
  (a, b) => {
    const aVal = fn(a);
    const bVal = fn(b);
    if (!aVal && !bVal) return 0;
    if (!aVal) return 1;
    if (!bVal) return -1;
    return comparator(aVal, bVal);
  };

export const byString = <T>(fn: (item: T) => string | null | undefined): Comparator<T> =>
  by(fn, (a: string, b: string): number => a.localeCompare(b));

export const byNumber =
  <T>(fn: (item: T) => number | null | undefined): Comparator<T> =>
  (a, b) =>
    (fn(a) ?? 0) - (fn(b) ?? 0);

export const byBoolean =
  <T>(fn: (item: T) => boolean | null | undefined): Comparator<T> =>
  (a, b) =>
    Number(fn(a) ?? false) - Number(fn(b) ?? false);

export const byDate =
  <T>(fn: (item: T) => Date | null | undefined): Comparator<T> =>
  (a, b) =>
    (fn(a)?.getTime() ?? 0) - (fn(b)?.getTime() ?? 0);

export const byLength =
  <T>(fn: (item: T) => unknown[] | null | undefined): Comparator<T> =>
  (a, b) =>
    (fn(a)?.length ?? 0) - (fn(b)?.length ?? 0);

export function compare<T>(
  ...comparators: (Comparator<T> | false | null | undefined)[]
): Comparator<T> {
  return (a: T, b: T): number => {
    let result = 0;
    for (const comparator of comparators) {
      if (!comparator) {
        continue;
      }
      result = comparator(a, b);
      if (result) {
        break;
      }
    }
    return result;
  };
}

export function reverseOrder<T>(comparator: Comparator<T>): Comparator<T> {
  return (a: T, b: T): number => -1 * comparator(a, b);
}
