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

export type Comparator<T> = (a: T, b: T) => number;

export function reverseOrder<T>(comparator: Comparator<T>): Comparator<T> {
  return (a: T, b: T): number => -1 * comparator(a, b);
}

export const compareById: Comparator<{id?: number}> = ({id: a}, {id: b}) => (a ?? 0) - (b ?? 0);

export const compareByDate: Comparator<{date?: Date}> = ({date: a}, {date: b}) =>
  (a?.getTime() ?? 0) - (b?.getTime() ?? 0);
