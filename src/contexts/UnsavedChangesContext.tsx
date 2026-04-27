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

import type {ReactNode} from 'react';
import {createContext, useMemo, useRef} from 'react';

import {asyncNoop, noop} from '~/src/utils/function';

type Checker = () => Promise<void>;

interface ContextType {
  registerChecker: (fn: Checker) => () => void;
  checkUnsaved: Checker;
}

export const UnsavedChangesContext = createContext<ContextType>({
  registerChecker: () => noop,
  checkUnsaved: asyncNoop,
});

export const UnsavedChangesProvider: React.FC<{children: ReactNode}> = ({children}) => {
  const checkersRef = useRef<Set<Checker>>(new Set());

  const value = useMemo<ContextType>(
    () => ({
      registerChecker: (fn: Checker) => {
        checkersRef.current.add(fn);
        return () => {
          checkersRef.current.delete(fn);
        };
      },
      checkUnsaved: async () => {
        for (const fn of checkersRef.current) {
          await fn();
        }
      },
    }),
    []
  );

  return <UnsavedChangesContext.Provider value={value}>{children}</UnsavedChangesContext.Provider>;
};
