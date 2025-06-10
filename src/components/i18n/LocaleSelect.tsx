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

import {GlobalOutlined} from '@ant-design/icons';
import {useLingui} from '@lingui/react/macro';
import {Form, Select} from 'antd';
import type {DefaultOptionType as SelectOptionType} from 'antd/es/select';

import {type Locale} from '~/src/i18n';
import {useAppStore} from '~/src/stores/app-store';

const LOCALE_LABELS: Record<Locale, string> = {
  bg: 'Български',
  cs: 'Čeština',
  da: 'Dansk',
  de: 'Deutsch',
  el: 'Ελληνικά',
  en: 'English',
  es: 'Español',
  fi: 'Suomi',
  fr: 'Français',
  hi: 'हिन्दी',
  hu: 'Magyar',
  it: 'Italiano',
  ja: '日本語',
  ko: '한국어',
  nl: 'Nederlands',
  nb: 'Norsk',
  pl: 'Polski',
  pt: 'Português',
  ro: 'Română',
  sk: 'Slovenčina',
  sv: 'Svenska',
  tr: 'Türkçe',
  uk: 'Українська',
};

const LOCALE_OPTIONS: SelectOptionType[] = Object.entries(LOCALE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export const LocaleSelect: React.FC = () => {
  const locale = useAppStore(state => state.locale);

  const setLocale = useAppStore(state => state.setLocale);

  const {t} = useLingui();

  return (
    <Form.Item label={t`Language`} style={{marginBottom: 0}}>
      <Select
        options={LOCALE_OPTIONS}
        placeholder={t`Select language`}
        prefix={<GlobalOutlined />}
        value={locale}
        onChange={value => {
          void setLocale(value);
        }}
        popupMatchSelectWidth={false}
        style={{width: 'auto'}}
      />
    </Form.Item>
  );
};
