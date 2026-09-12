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

import {DownloadOutlined, MoreOutlined, PictureOutlined, PrinterOutlined} from '@ant-design/icons';
import {Trans, useLingui} from '@lingui/react/macro';
import {Button, Dropdown, Grid, Space} from 'antd';

import {ImageSaveButton} from '@/components/image/ImageSaveButton';

interface Props {
  collapseBelow: 'sm' | 'md';
  disabled?: boolean;
  onPrint: () => void;
  onSave: () => Promise<void> | void;
  onSetAsReference?: () => Promise<void> | void;
}

export function ImageActions({
  collapseBelow,
  disabled,
  onPrint,
  onSave,
  onSetAsReference,
}: Readonly<Props>) {
  const screens = Grid.useBreakpoint();

  const {t} = useLingui();

  if (screens[collapseBelow]) {
    // A component is one child of the surrounding Space, so the buttons need their own spacing.
    return (
      <Space>
        <Button icon={<PrinterOutlined />} onClick={onPrint} disabled={disabled}>
          <Trans>Print</Trans>
        </Button>
        <ImageSaveButton onSave={onSave} onSetAsReference={onSetAsReference} disabled={disabled} />
      </Space>
    );
  }

  return (
    <Dropdown
      trigger={['click']}
      menu={{
        items: [
          {
            key: 'print',
            label: <Trans>Print</Trans>,
            icon: <PrinterOutlined />,
            onClick: onPrint,
            disabled,
          },
          {
            key: 'save',
            label: <Trans>Save</Trans>,
            icon: <DownloadOutlined />,
            onClick: () => {
              void onSave();
            },
            disabled,
          },
          ...(onSetAsReference
            ? [
                {
                  key: 'set-as-reference',
                  label: <Trans>Set as reference</Trans>,
                  icon: <PictureOutlined />,
                  onClick: () => {
                    void onSetAsReference();
                  },
                  disabled,
                },
              ]
            : []),
        ],
      }}
    >
      <Button icon={<MoreOutlined />} aria-label={t`More actions`} disabled={disabled} />
    </Dropdown>
  );
}
