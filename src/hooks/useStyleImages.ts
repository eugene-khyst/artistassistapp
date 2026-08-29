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

import {indexById} from '@eugene-khyst/artistassistapp-color-mixer';
import {useQuery, type UseQueryResult} from '@tanstack/react-query';

import {fetchStyleImages, type StyleImageDefinition} from '@/services/image/style-images';

interface Result {
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  styleImages?: Map<string, StyleImageDefinition>;
}

export function useStyleImages(): Result {
  const {isLoading, isError, error, data}: UseQueryResult<Map<string, StyleImageDefinition>> =
    useQuery({
      queryKey: ['style-images'],
      queryFn: fetchStyleImages,
      select: indexById,
    });
  return {
    isLoading,
    isError,
    error,
    styleImages: data,
  };
}
