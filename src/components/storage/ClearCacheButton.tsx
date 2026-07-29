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

import {ClearOutlined} from '@ant-design/icons';
import {Trans} from '@lingui/react/macro';
import {Button, Popconfirm} from 'antd';
import {useState} from 'react';

import {clearCache} from '@/utils/storage';

export function ClearCacheButton() {
  const [isClearing, setIsClearing] = useState<boolean>(false);

  const handleClearCache = async () => {
    try {
      setIsClearing(true);
      await clearCache();
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <Popconfirm
      title={<Trans>Clear cache</Trans>}
      description={
        <Trans>
          ArtistAssistApp will reload after removing temporary app files.
          <br />
          Your saved work and cloud data will not be deleted.
        </Trans>
      }
      onConfirm={() => void handleClearCache()}
      okText={<Trans>Clear cache</Trans>}
      cancelText={<Trans>Cancel</Trans>}
    >
      <Button icon={<ClearOutlined />} loading={isClearing}>
        <Trans>Clear cache</Trans>
      </Button>
    </Popconfirm>
  );
}
