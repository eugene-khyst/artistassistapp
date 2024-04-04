/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Card} from 'antd';
import {Dispatch, SetStateAction} from 'react';

type Props = {
  image: string | URL;
  thumbnail?: string | URL;
  name: string;
  setBlob: Dispatch<SetStateAction<Blob | undefined>>;
  setImageFileId: Dispatch<SetStateAction<number | undefined>>;
  setImageLoadingCount: Dispatch<SetStateAction<number>>;
};

export const SampleImage: React.FC<Props> = ({
  image,
  thumbnail,
  name,
  setBlob,
  setImageFileId,
  setImageLoadingCount,
}: Props) => {
  const handleCardClick = async () => {
    setImageLoadingCount((prev: number) => prev + 1);
    const response: Response = await fetch(image);
    const blob: Blob = await response.blob();
    setBlob(blob);
    setImageFileId(undefined);
    setImageLoadingCount((prev: number) => prev - 1);
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
