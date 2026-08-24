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

import {describe, expect, it, vi} from 'vitest';

import {createAbortableOperation} from '@/utils/abortable-operation';

describe('createAbortableOperation', () => {
  it('does not check cancellation again after a terminal commit', async () => {
    const onFinish = vi.fn();
    const operation = createAbortableOperation({onFinish});

    const result = await operation.runAndCommit(
      () => 'result',
      value => {
        operation.abort();
        return `${value}-committed`;
      }
    );

    expect(result).toBe('result-committed');
    expect(onFinish).toHaveBeenCalledOnce();
  });

  it('discards a result produced after cancellation', async () => {
    const commit = vi.fn();
    const discard = vi.fn();
    let resolveTask: (result: string) => void = () => undefined;
    const operation = createAbortableOperation();
    const run = operation.runAndCommit(
      async () =>
        await new Promise<string>(resolve => {
          resolveTask = resolve;
        }),
      commit,
      discard
    );

    operation.abort();
    resolveTask('stale-result');

    await expect(run).resolves.toBeUndefined();
    expect(commit).not.toHaveBeenCalled();
    expect(discard).toHaveBeenCalledWith('stale-result');
  });
});
