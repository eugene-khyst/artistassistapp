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

import type {RgbTuple} from '@eugene-khyst/artistassistapp-color-mixer';
import {useLingui} from '@lingui/react/macro';
import {Tag} from 'antd';

import {TAB_LABELS, TONAL_VALUE_LABELS} from '@/components/messages';
import {getRgbTonalValue} from '@/services/color/tonal-value';
import {useAppStore} from '@/stores/app-store';
import {TabKey} from '@/tabs';

import styles from './TonalValueTag.module.css';

interface Props {
  rgb: RgbTuple;
  interactive?: boolean;
}

export function TonalValueTag({rgb, interactive = true}: Readonly<Props>) {
  const hasImage = useAppStore(state => !!state.originalImage);
  const setActiveTabKey = useAppStore(state => state.setActiveTabKey);

  const {t} = useLingui();

  const tonalValueLabel = t(TONAL_VALUE_LABELS[getRgbTonalValue(rgb)]);
  if (!interactive || !hasImage) {
    return <Tag>{tonalValueLabel}</Tag>;
  }

  const label = t(TAB_LABELS[TabKey.TonalValues]);

  return (
    <Tag
      role="button"
      tabIndex={0}
      title={t`Go to the ${label} tab`}
      className={styles['clickable']}
      onClick={() => void setActiveTabKey(TabKey.TonalValues)}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          event.currentTarget.click();
        }
      }}
    >
      {tonalValueLabel}
    </Tag>
  );
}
