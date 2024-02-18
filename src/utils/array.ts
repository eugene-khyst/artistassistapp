/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

export function createArray<T>(size: number, element: T): T[] {
  return Array(size).fill(element);
}

export function create2DArray<T>(rows: number, cols: number, element: T): T[][] {
  return Array(rows)
    .fill(0)
    .map(() => Array(cols).fill(element));
}

export function range(min: number, max: number): number[] {
  return Array.from({length: max - min + 1}, (_, i) => i + min);
}

export function unique<T, S extends string | number>(array: T[], identityFn: (element: T) => S) {
  if (!array.length) {
    return [];
  }
  const identities = new Set<S>();
  return array.filter((element: T) => {
    const identity: S = identityFn(element);
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
