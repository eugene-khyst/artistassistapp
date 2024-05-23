/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Card} from 'antd';
import type {Dispatch, SetStateAction} from 'react';

import {useAppStore} from '~/src/stores/app-store';

type Props = {
  image: string | URL;
  thumbnail?: string | URL;
  name: string;
  setImageLoadingCount: Dispatch<SetStateAction<number>>;
};

export const SampleImage: React.FC<Props> = ({
  image,
  thumbnail,
  name,
  setImageLoadingCount,
}: Props) => {
  const setImageFile = useAppStore(state => state.setImageFile);

  const handleCardClick = () => {
    void (async () => {
      setImageLoadingCount((prev: number) => prev + 1);
      const response: Response = await fetch(image);
      const blob: Blob = await response.blob();
      void setImageFile({file: new File([blob], '')});
      setImageLoadingCount((prev: number) => prev - 1);
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
