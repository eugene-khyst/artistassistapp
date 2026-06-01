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

export function toEpochSeconds(date: Date): number {
  if (!isValidDate(date)) {
    throw new TypeError(`Invalid date: ${String(date)}`);
  }
  return Math.floor(date.getTime() / 1000);
}

export function fromEpochSeconds(epochSeconds: number | string | null | undefined): Date {
  if (epochSeconds == null) {
    throw new TypeError(`Invalid timestamp: ${String(epochSeconds)}`);
  }
  const seconds: number =
    typeof epochSeconds === 'string'
      ? epochSeconds.trim()
        ? Number(epochSeconds)
        : NaN
      : epochSeconds;
  const date = new Date(seconds * 1000);
  if (!isValidDate(date)) {
    throw new TypeError(`Invalid timestamp: ${epochSeconds}`);
  }
  return date;
}

export function isValidDate(date: Date | null | undefined): date is Date {
  return date instanceof Date && !Number.isNaN(date.getTime());
}
