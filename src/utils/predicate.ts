/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

export type Predicate<T> = (arg: T) => boolean;

export function not<T>(predicate: Predicate<T>) {
  return (arg: T) => !predicate(arg);
}
