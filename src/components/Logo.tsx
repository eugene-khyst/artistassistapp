/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Space, theme} from 'antd';

const LOGO = new URL('../assets/images/logo.svg', import.meta.url);

type Props = {
  name?: boolean;
  tagline?: boolean;
  size?: number;
};

export const Logo: React.FC<Props> = ({name = false, tagline = false, size}: Props) => {
  const {
    token: {fontSizeLG, fontSizeXL},
  } = theme.useToken();

  return (
    <Space size="small" align="center" wrap>
      <img src={LOGO.toString()} alt="ArtistAssistApp logo" style={{width: size ?? 150}} />
      <div>
        {name && (
          <div
            style={{
              textAlign: 'left',
              fontFamily: 'Kalam',
              fontSize: fontSizeXL,
              fontWeight: 'bold',
              color: '#3D3A3D',
            }}
          >
            ArtistAssistApp
          </div>
        )}
        {tagline && (
          <div
            style={{
              marginBottom: 8,
              textAlign: 'left',
              fontFamily: 'Kalam',
              fontSize: fontSizeLG,
              color: '#3D3A3D',
            }}
          >
            The web app to paint better with ease
          </div>
        )}
      </div>
    </Space>
  );
};
