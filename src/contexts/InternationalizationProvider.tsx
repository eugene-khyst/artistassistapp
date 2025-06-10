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

import {i18n} from '@lingui/core';
import {I18nProvider} from '@lingui/react';
import {ConfigProvider} from 'antd';
import {type PropsWithChildren} from 'react';

import {useAppStore} from '~/src/stores/app-store';

export const InternationalizationProvider: React.FC<PropsWithChildren> = ({
  children,
}: PropsWithChildren) => {
  const antdLocale = useAppStore(state => state.antdLocale);

  return (
    <I18nProvider i18n={i18n}>
      <ConfigProvider locale={antdLocale}>{children}</ConfigProvider>
    </I18nProvider>
  );
};
