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

import {computeIfAbsentInMap} from '~/src/utils';

export type EventListener<S> = (data: S) => void | Promise<void>;

export class EventManager<T extends string> {
  private readonly listeners = new Map<T, EventListener<any>[]>();

  subscribe<S>(eventType: T, listener: EventListener<S>) {
    computeIfAbsentInMap(this.listeners, eventType, () => []).push(listener);
  }

  unsubscribe<S>(eventType: T, listener: EventListener<S>) {
    const listeners = this.listeners.get(eventType) ?? [];
    this.listeners.set(
      eventType,
      listeners.filter(l => l !== listener)
    );
  }

  notify(eventType: T, data: unknown) {
    this.listeners.get(eventType)?.forEach((listener: EventListener<unknown>) => {
      void listener(data);
    });
  }

  destroy() {
    this.listeners.clear();
  }
}
