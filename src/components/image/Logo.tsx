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

import {Space, theme} from 'antd';

interface Props {
  name?: boolean;
  tagline?: boolean;
  size?: number;
}

export const Logo: React.FC<Props> = ({name = false, tagline = false, size}: Props) => {
  const {
    token: {fontSizeHeading1, fontSizeHeading2},
  } = theme.useToken();

  return (
    <Space direction="vertical" align="center" style={{width: '100%'}}>
      <img
        src="/assets/favicon/favicon.svg"
        alt="ArtistAssistApp logo"
        className="drop-shadow-lg"
        style={{
          display: 'block',
          width: size ?? 150,
        }}
      />

      {name && (
        <div
          className="drop-shadow"
          style={{
            textAlign: 'center',
            fontFamily: 'Kalam',
            fontSize: fontSizeHeading1,
            fontWeight: 'bold',
            lineHeight: '1em',
          }}
        >
          <span className="text-outline" style={{color: '#656b89'}}>
            Artist
          </span>
          <span className="text-outline" style={{color: '#7b6085'}}>
            Assist
          </span>
          <span className="text-outline" style={{color: '#895983'}}>
            App
          </span>
          <span className="text-outline" style={{color: '#945382'}}>
            .com
          </span>
        </div>
      )}
      {tagline && (
        <div
          className="text-outline text-outline-black drop-shadow"
          style={{
            textAlign: 'center',
            fontFamily: 'Kalam',
            fontSize: fontSizeHeading2,
            lineHeight: '1em',
            color: 'white',
          }}
        >
          Paint better with ease
        </div>
      )}
    </Space>
  );
};
