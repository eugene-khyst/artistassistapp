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
import {useState} from 'react';

import {useInstallPrompt} from '~/src/hooks/useInstallPrompt';

import {InstallDrawer} from './InstallDrawer';

export const InstallButton: React.FC = () => {
  const {showInstallPromotion, promptToInstall} = useInstallPrompt();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleClick = () => {
    if (showInstallPromotion) {
      void promptToInstall();
    } else {
      setIsDrawerOpen(true);
    }
  };

  return (
    <>
      <Button icon={<AppstoreAddOutlined />} onClick={handleClick}>
        <Trans>Install</Trans>
      </Button>
      <InstallDrawer
        open={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
        }}
      />
    </>
  );
};
