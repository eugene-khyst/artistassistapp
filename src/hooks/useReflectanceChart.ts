/**
 * ArtistAssistApp
 * Copyright (C) 2023-2024  Eugene Khyst
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

import type {MutableRefObject, RefCallback} from 'react';
import {useCallback, useRef} from 'react';

import {ReflectanceChart} from '~/src/services/canvas/chart';

interface Result {
  ref: RefCallback<HTMLCanvasElement>;
  reflectanceChartRef: MutableRefObject<ReflectanceChart | undefined>;
}

export function useReflectanceChart(): Result {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const reflectanceChartRef = useRef<ReflectanceChart>();
  const ref = useCallback((node: HTMLCanvasElement | null) => {
    reflectanceChartRef.current?.destroy();
    reflectanceChartRef.current = undefined;
    if (node) {
      canvasRef.current = node;
      reflectanceChartRef.current = new ReflectanceChart(node);
    }
  }, []);

  return {
    ref,
    reflectanceChartRef,
  };
}
