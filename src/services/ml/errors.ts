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

import {getErrorMessage} from '@/utils/error';

export class WebGpuInferenceError extends Error {
  constructor(cause: unknown) {
    super(getErrorMessage(cause), {cause});
    this.name = 'WebGpuInferenceError';
  }
}

export function isWebGpuInferenceError(error: unknown): error is WebGpuInferenceError {
  // Comlink preserves the error name but not its prototype.
  return error instanceof Error && error.name === 'WebGpuInferenceError';
}
