/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {RefObject} from 'react';
import {useIntersectionObserver} from 'usehooks-ts';

export function useVisibilityChange(elementRef: RefObject<Element>) {
  const entry = useIntersectionObserver(elementRef, {});
  return !!entry?.isIntersecting;
}
