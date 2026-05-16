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
import {Space, Typography} from 'antd';
import type React from 'react';

export const EmptyTargetColor: React.FC = () => {
  return (
    <Space orientation="vertical">
      <Typography.Text strong>
        <Trans>No target color is selected.</Trans>
      </Typography.Text>
      <Typography.Text>
        <Trans>
          Click 🖱️ or tap 👆 anywhere in the photo, or use the color picker pop-up to choose a
          target color for mixing from your colors.
        </Trans>
      </Typography.Text>
      <Typography.Text>
        🔎 <Trans>Pinch or scroll to zoom, drag to pan.</Trans>
      </Typography.Text>
    </Space>
  );
};
