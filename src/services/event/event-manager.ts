/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {computeIfAbsentInMap} from '~/src/utils';

export type EventListener<S> = (data: S) => void | Promise<void>;

export class EventManager<T extends string> {
  private listeners: Map<T, EventListener<any>[]> = new Map();

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

  notify<S>(eventType: T, data: S) {
    this.listeners.get(eventType)?.forEach((listener: EventListener<S>) => {
      void listener(data);
    });
  }

  destroy() {
    this.listeners.clear();
  }
}
