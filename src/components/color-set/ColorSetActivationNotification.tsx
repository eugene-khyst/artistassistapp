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

import {Trans} from '@lingui/react/macro';
import {Button} from 'antd';

import {useErrorNotification} from '@/hooks/useErrorNotification';
import {useAppStore} from '@/stores/app-store';
import {getErrorMessage} from '@/utils/error';

export function ColorSetActivationNotification() {
  const colorSetActivationError = useAppStore(state => state.colorSetActivationError);

  const activateLatestColorSet = useAppStore(state => state.activateLatestColorSet);

  useErrorNotification(
    !!colorSetActivationError,
    <Trans>Unable to restore the saved color set</Trans>,
    getErrorMessage(colorSetActivationError),
    <Button size="small" onClick={() => void activateLatestColorSet()}>
      <Trans>Retry</Trans>
    </Button>
  );

  return null;
}
