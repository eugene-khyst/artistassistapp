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

import {DownloadOutlined, DownOutlined, PictureOutlined} from '@ant-design/icons';
import {Trans, useLingui} from '@lingui/react/macro';
import {Button, Dropdown, Space} from 'antd';

interface Props {
  disabled?: boolean;
  onSave: () => Promise<void> | void;
  onSetAsReference?: () => Promise<void> | void;
}

export function ImageSaveButton({disabled, onSave, onSetAsReference}: Readonly<Props>) {
  const {t} = useLingui();

  const saveButton = (
    <Button
      icon={<DownloadOutlined />}
      onClick={() => {
        void onSave();
      }}
      disabled={disabled}
    >
      <Trans>Save</Trans>
    </Button>
  );

  if (!onSetAsReference) {
    return saveButton;
  }

  return (
    <Space.Compact>
      {saveButton}
      <Dropdown
        menu={{
          items: [
            {
              key: 'set-as-reference',
              label: <Trans>Set as reference</Trans>,
              icon: <PictureOutlined />,
              onClick: () => {
                void onSetAsReference();
              },
            },
          ],
        }}
        trigger={['click']}
      >
        <Button icon={<DownOutlined />} aria-label={t`More actions`} disabled={disabled} />
      </Dropdown>
    </Space.Compact>
  );
}
