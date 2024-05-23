/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import type {RefObject} from 'react';
import {useIntersectionObserver} from 'usehooks-ts';

export function useVisibilityChange(elementRef: RefObject<Element>): boolean {
  const entry = useIntersectionObserver(elementRef, {});
  return !!entry?.isIntersecting;
}
