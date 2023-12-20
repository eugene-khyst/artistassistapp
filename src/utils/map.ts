/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

export function computeIfAbsentInMap<K, V>(map: Map<K, V>, key: K, valueFn: (key: K) => V): V {
  const value: V | undefined = map.get(key);
  if (value) {
    return value;
  }
  const newValue: V = valueFn(key);
  map.set(key, newValue);
  return newValue;
}

export function maxInMap<V>(map: Map<any, V>, valueFn: (value: V) => number): number {
  let max = Number.NEGATIVE_INFINITY;
  for (const value of map.values()) {
    max = Math.max(max, valueFn(value));
  }
  return max;
}
