/**
 * ArtistAssistApp
 * Copyright (C) 2023-2024  Eugene Khyst
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

import {Space, theme} from 'antd';

interface Props {
  name?: boolean;
  tagline?: boolean;
  size?: number;
}

export const Logo: React.FC<Props> = ({name = false, tagline = false, size}: Props) => {
  const {
    token: {fontSizeHeading2, fontSizeHeading3},
  } = theme.useToken();

  return (
    <Space direction="vertical" align="center" style={{width: '100%'}}>
      <img
        src="/assets/favicon/favicon.svg"
        alt="ArtistAssistApp logo"
        style={{width: size ?? 150}}
      />

      {name && (
        <div
          style={{
            textAlign: 'center',
            fontFamily: 'Kalam',
            fontSize: fontSizeHeading2,
            fontWeight: 'bold',
            lineHeight: '1em',
          }}
        >
          <span style={{color: '#656b89'}}>Artist</span>
          <span style={{color: '#7b6085'}}>Assist</span>
          <span style={{color: '#895983'}}>App</span>
          <span style={{color: '#945382'}}>.com</span>
        </div>
      )}
      {tagline && (
        <div
          style={{
            textAlign: 'center',
            fontFamily: 'Kalam',
            fontSize: fontSizeHeading3,
            lineHeight: '1em',
          }}
        >
          <span style={{color: '#656b89'}}>Paint </span>
          <span style={{color: '#767c7d'}}>better </span>
          <span style={{color: '#848974'}}>with </span>
          <span style={{color: '#8f936e'}}>ease</span>
        </div>
      )}
    </Space>
  );
};
