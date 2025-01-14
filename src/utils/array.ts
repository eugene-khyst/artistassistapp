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

export type TypedArray =
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array;

export type Comparator<T> = (a: T, b: T) => number;

export type ArrayElement<ArrayType extends readonly unknown[] | undefined> =
  ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

export function range(min: number, max: number): number[] {
  return Array.from({length: max - min + 1}, (_, i) => i + min);
}

export function unique<T>(array: T[], identityFn: (element: T) => string | number) {
  if (!array.length) {
    return [];
  }
  const identities = new Set<string | number>();
  return array.filter((element: T) => {
    const identity: string | number = identityFn(element);
    if (identities.has(identity)) {
      return false;
    }
    identities.add(identity);
    return true;
  });
}

export function arrayEquals<T>(a: T[] | null, b: T[] | null): boolean {
  if (a === null || b === null) {
    return a === null && b === null;
  }
  return (
    Array.isArray(a) &&
    Array.isArray(b) &&
    a.length === b.length &&
    a.every((element, index) => element === b[index])
  );
}

export function reverseOrder<T>(comparator: Comparator<T>): Comparator<T> {
  return (a: T, b: T): number => -1 * comparator(a, b);
}
