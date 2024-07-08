/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Card} from 'antd';
import type {Dispatch, SetStateAction} from 'react';

import {useAppStore} from '~/src/stores/app-store';
import {fetchAndCache} from '~/src/utils';

type Props = {
  image: string | URL;
  thumbnail?: string | URL;
  name: string;
  setLoadingCount: Dispatch<SetStateAction<number>>;
};

export const SampleImageCard: React.FC<Props> = ({
  image,
  thumbnail,
  name,
  setLoadingCount,
}: Props) => {
  const setImageFile = useAppStore(state => state.setImageFile);

  const handleCardClick = () => {
    void (async () => {
      setLoadingCount((prev: number) => prev + 1);
      const response: Response = await fetchAndCache(image);
      const blob: Blob = await response.blob();
      void setImageFile({file: new File([blob], '')});
      setLoadingCount((prev: number) => prev - 1);
    })();
  };

  return (
    <Card
      hoverable
      onClick={handleCardClick}
      cover={<img src={thumbnail?.toString() ?? image.toString()} alt={name} loading="lazy" />}
    >
      <Card.Meta title={name} />
    </Card>
  );
};
