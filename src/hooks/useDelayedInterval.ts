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

import {useEffect, useState} from 'react';

type Result = [open: boolean, setOpen: (open: boolean) => void];

export function useDelayedInterval(initialDelay: number, interval: number): Result {
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => {
      setReady(true);
      setOpen(true);
    }, initialDelay);
    return () => {
      clearTimeout(id);
      setReady(false);
    };
  }, [initialDelay]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    const id = setInterval(() => {
      setOpen(true);
    }, interval);
    return () => {
      clearInterval(id);
    };
  }, [ready, interval]);

  return [open, setOpen];
}
