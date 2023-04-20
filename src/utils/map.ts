/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

export function computeIfAbsent<K, V>(map: Map<K, V>, key: K, valueFn: (key: K) => V): V {
  const value: V | undefined = map.get(key);
  if (value) {
    return value;
  }
  const newValue: V = valueFn(key);
  map.set(key, newValue);
  return newValue;
}
