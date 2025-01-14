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

import type {Fraction} from '~/src/utils/fraction';

export function countFractionDigits(number: number): number {
  const numberStr = String(number);
  if (numberStr.includes('.')) {
    return numberStr.split('.')[1]!.length;
  }
  return 0;
}

export function formatFraction([part, whole]: Fraction): string {
  return `${part}/${whole}`;
}

export function formatRatio([part, whole]: Fraction, inverse = false): string {
  return inverse ? `${whole - part}:${part}` : `${part}:${whole - part}`;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return '0 Bytes';
  }
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]!;
}
