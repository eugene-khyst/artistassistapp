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

export interface ImageDependency {
  abort?: () => void;
  clear?: () => void;
}

export class ImageDependencyRegistry {
  private readonly dependencies: ImageDependency[] = [];

  register(dependency: ImageDependency): void {
    this.dependencies.push(dependency);
  }

  abort(): void {
    for (const {abort} of this.dependencies) {
      abort?.();
    }
  }

  clear(): void {
    for (const {clear} of this.dependencies) {
      clear?.();
    }
  }

  abortAndClear(): void {
    this.abort();
    this.clear();
  }
}
