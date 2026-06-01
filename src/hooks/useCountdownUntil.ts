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

import {useEffect, useState} from 'react';

function getRemainingSeconds(targetDate?: Date | null): number {
  return targetDate ? Math.max(0, Math.round((targetDate.getTime() - Date.now()) / 1000)) : 0;
}

export function useCountdownUntil(targetDate?: Date | null, active = true): number {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!active || !targetDate) return;
    const id = setInterval(() => {
      tick(t => t + 1);
    }, 1000);
    return () => {
      clearInterval(id);
    };
  }, [active, targetDate]);
  return active ? getRemainingSeconds(targetDate) : 0;
}
