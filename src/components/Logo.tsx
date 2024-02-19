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
    token: {fontSizeHeading2, fontSizeHeading3},
  } = theme.useToken();

  return (
    <Space direction="vertical" size="small" align="center">
      <img src={LOGO.toString()} alt="ArtistAssistApp logo" style={{width: size ?? 150}} />

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
