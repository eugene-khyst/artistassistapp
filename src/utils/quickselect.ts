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

/**
 * In-place quickselect with Hoare partition and median-of-three pivot.
 * Partitions elements in [start, end) so that the element at index k
 * is in its sorted position, all elements before k are ≤ it,
 * and all elements after k are ≥ it.
 *
 * Average time complexity: O(N).
 *
 * @param start - Inclusive start index
 * @param end - Exclusive end index
 * @param k - Target index to partition around
 * @param value - Extracts the sort key for element at index i
 * @param swap - Swaps elements at indices a and b
 */
export function quickselect(
  start: number,
  end: number,
  k: number,
  value: (i: number) => number,
  swap: (a: number, b: number) => void
): void {
  if (k < start || k >= end) {
    throw new RangeError(`k=${k} is out of bounds [${start}, ${end})`);
  }
  let lo = start;
  let hi = end - 1;
  while (lo < hi) {
    // Median-of-three pivot
    const midIdx = (lo + hi) >>> 1;
    const loVal = value(lo);
    const midVal = value(midIdx);
    const hiVal = value(hi);
    let pivotIdx: number;
    if ((loVal <= midVal && midVal <= hiVal) || (hiVal <= midVal && midVal <= loVal)) {
      pivotIdx = midIdx;
    } else if ((midVal <= loVal && loVal <= hiVal) || (hiVal <= loVal && loVal <= midVal)) {
      pivotIdx = lo;
    } else {
      pivotIdx = hi;
    }
    const pivotVal = value(pivotIdx);
    swap(pivotIdx, lo);

    // Hoare partition
    let i = lo;
    let j = hi + 1;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (true) {
      do {
        i++;
      } while (i <= hi && value(i) < pivotVal);
      do {
        j--;
      } while (value(j) > pivotVal);
      if (i >= j) {
        break;
      }
      swap(i, j);
    }
    swap(lo, j);

    if (j === k) {
      return;
    } else if (j < k) {
      lo = j + 1;
    } else {
      hi = j - 1;
    }
  }
}
