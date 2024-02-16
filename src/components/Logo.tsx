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
    <Space direction="vertical" size="small" align="center">
      <img src={LOGO.toString()} alt="ArtistAssistApp logo" style={{width: size ?? 150}} />
      <div>
        {name && (
          <div
            style={{
              textAlign: 'center',
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
              textAlign: 'center',
              fontFamily: 'Kalam',
              fontSize: fontSizeLG,
              color: '#3D3A3D',
            }}
          >
            Paint better with ease
          </div>
        )}
      </div>
    </Space>
  );
};
