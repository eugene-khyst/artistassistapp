/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Card} from 'antd';
import * as dayjs from 'dayjs';
import {Dispatch, SetStateAction} from 'react';
import {useCreateObjectUrl} from '../../hooks/useCreateObjectUrl';
import {TabKey} from '../types';

type Props = {
  file: File;
  date?: Date;
  setBlob: Dispatch<SetStateAction<Blob | undefined>>;
  setActiveTabKey: Dispatch<SetStateAction<TabKey>>;
  showZoomAndPanMessage: () => void;
};

export const RecentImage: React.FC<Props> = ({
  file,
  date,
  setBlob,
  setActiveTabKey,
  showZoomAndPanMessage,
}: Props) => {
  const imageSrc: string | undefined = useCreateObjectUrl(file);
  const dateStr: string | undefined = date && dayjs(date).format('DD/MM/YYYY');

  const handleCardClick = () => {
    setBlob(file);
    setActiveTabKey(TabKey.Colors);
    showZoomAndPanMessage();
  };

  return (
    imageSrc && (
      <Card hoverable onClick={handleCardClick} cover={<img src={imageSrc} alt={file.name} />}>
        <Card.Meta title={file.name} description={`Loaded on ${dateStr}`} />
      </Card>
    )
  );
};
