/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Card} from 'antd';
import Meta from 'antd/es/card/Meta';
import * as dayjs from 'dayjs';
import {Dispatch, SetStateAction, useEffect, useState} from 'react';
import {ImageFile} from '../services/db/db';
import {TabKey} from './types';

type Props = {
  imageFile: ImageFile;
  setFile: Dispatch<SetStateAction<File | undefined>>;
  setActiveTabKey: Dispatch<SetStateAction<TabKey>>;
};

export const RecentImage: React.FC<Props> = ({
  imageFile: {file: recentFile, date},
  setFile,
  setActiveTabKey,
}: Props) => {
  const dateStr = dayjs(date).format('DD/MM/YYYY');
  const [imageSrc, setImageSrc] = useState<string | undefined>();

  useEffect(() => {
    const url = URL.createObjectURL(recentFile);
    setImageSrc(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [recentFile]);

  const handleCardClick = () => {
    setFile(recentFile);
    setActiveTabKey(TabKey.Colors);
  };

  return (
    imageSrc && (
      <Card
        hoverable
        onClick={handleCardClick}
        cover={<img src={imageSrc} alt={recentFile.name} />}
      >
        <Meta title={recentFile.name} description={`Loaded on ${dateStr}`} />
      </Card>
    )
  );
};
