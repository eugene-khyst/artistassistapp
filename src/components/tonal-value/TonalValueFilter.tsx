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

import {FilterOutlined} from '@ant-design/icons';
import {TONAL_VALUES} from '@eugene-khyst/artistassistapp-image-processing/color/tonal-value';
import {Trans, useLingui} from '@lingui/react/macro';
import {Button, Dropdown} from 'antd';

import {TONAL_VALUE_LABELS} from '@/components/messages';
import {useAppStore} from '@/stores/app-store';

export function TonalValueFilter() {
  const selectedTonalValue = useAppStore(state => state.selectedTonalValue);
  const setSelectedTonalValue = useAppStore(state => state.setSelectedTonalValue);

  const {t} = useLingui();

  return (
    <Dropdown
      trigger={['click']}
      menu={{
        selectedKeys: [selectedTonalValue === null ? 'all' : String(selectedTonalValue)],
        items: [
          {
            key: 'all',
            label: t`All`,
            onClick: () => {
              setSelectedTonalValue(null);
            },
          },
          ...TONAL_VALUES.map(value => ({
            key: String(value),
            label: t(TONAL_VALUE_LABELS[value]),
            onClick: () => {
              setSelectedTonalValue(value);
            },
          })),
        ],
      }}
    >
      <Button
        icon={<FilterOutlined />}
        type={selectedTonalValue === null ? 'default' : 'primary'}
        title={t`Filter saved mixtures by tonal value`}
      >
        <Trans>Filter</Trans>
      </Button>
    </Dropdown>
  );
}
