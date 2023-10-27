/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Card} from 'antd';
import {Dispatch, SetStateAction} from 'react';
import {TabKey} from '../types';

type Props = {
  image: string | URL;
  thumbnail?: string | URL;
  name: string;
  setBlob: Dispatch<SetStateAction<Blob | undefined>>;
  setActiveTabKey: Dispatch<SetStateAction<TabKey>>;
  showZoomAndPanMessage: () => void;
};

export const SampleImage: React.FC<Props> = ({
  image,
  thumbnail,
  name,
  setBlob,
  setActiveTabKey,
  showZoomAndPanMessage,
}: Props) => {
  const handleCardClick = async () => {
    const response: Response = await fetch(image);
    const blob: Blob = await response.blob();
    setBlob(blob);
    setActiveTabKey(TabKey.Colors);
    showZoomAndPanMessage();
  };

  return (
    <Card
      hoverable
      onClick={handleCardClick}
      cover={<img src={thumbnail?.toString() ?? image.toString()} alt={name} />}
    >
      <Card.Meta title={name} />
    </Card>
  );
};
