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

import {type RefObject, useEffectEvent, useLayoutEffect, useRef, useState} from 'react';

interface Result<T> {
  ref: RefObject<T | null>;
  collapseLevel: number;
}

function getWidth(element: Element): number {
  return element.getBoundingClientRect().width;
}

export function getCollapseLevel(element: HTMLElement, actionCount: number): number {
  const gap = parseFloat(getComputedStyle(element).columnGap);
  const widths = [...element.children].map(getWidth);
  const [overflowButton, ...fixed] = widths.slice(actionCount);
  const room = getWidth(element) - fixed.reduce((sum, item) => sum + item + gap, 0);
  const actionsFromEnd = widths.slice(0, actionCount).reverse();
  let width = actionsFromEnd.reduce((sum, action) => sum + action + gap, -gap);
  if (width <= room) {
    return 0;
  }
  const roomBesideOverflowButton = room - overflowButton! - gap;
  let level = 0;
  while (width > roomBesideOverflowButton && level < actionCount) {
    width -= actionsFromEnd[level]! + gap;
    level++;
  }
  return level;
}

export function useCollapseLevel<T extends HTMLElement>(actionCount: number): Result<T> {
  const ref = useRef<T>(null);
  const [collapseLevel, setCollapseLevel] = useState(0);

  const fit = useEffectEvent(() => {
    const element = ref.current!;
    if (element.clientWidth) {
      setCollapseLevel(getCollapseLevel(element, actionCount));
    }
  });

  useLayoutEffect(() => {
    const element = ref.current!;
    const resizeObserver = new ResizeObserver(() => {
      fit();
    });
    const observe = () => {
      resizeObserver.disconnect();
      [element, ...element.children].forEach(target => {
        resizeObserver.observe(target);
      });
    };
    const mutationObserver = new MutationObserver(observe);
    observe();
    mutationObserver.observe(element, {childList: true});
    fit();
    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  return {ref, collapseLevel: Math.min(collapseLevel, actionCount)};
}
