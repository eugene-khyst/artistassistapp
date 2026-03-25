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

import {AppstoreAddOutlined} from '@ant-design/icons';
import {Trans} from '@lingui/react/macro';
import {Button} from 'antd';

import {useDisplayMode} from '~/src/hooks/useDisplayMode';
import {useInstall} from '~/src/hooks/useInstall';
import {DisplayMode} from '~/src/utils/environment';

export const InstallButton: React.FC = () => {
  const {install, installDrawer} = useInstall();
  const displayMode = useDisplayMode();

  if (displayMode !== DisplayMode.BROWSER) {
    return null;
  }
  return (
    <>
      <Button icon={<AppstoreAddOutlined />} onClick={install}>
        <Trans>Install</Trans>
      </Button>
      {installDrawer}
    </>
  );
};
