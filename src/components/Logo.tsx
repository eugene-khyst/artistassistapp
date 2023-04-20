/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {CSSProperties} from 'react';

const LOGO = new URL('../assets/images/logo.svg', import.meta.url);

type Props = {
  style?: CSSProperties;
};

export const Logo: React.FC<Props> = ({style}: Props) => {
  return <img src={LOGO.toString()} alt="ArtistAssistApp logo" {...{style}} />;
};
