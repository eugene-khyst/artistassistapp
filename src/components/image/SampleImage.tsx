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
  setIsImageLoading: (name: string, isLoading: boolean) => void;
};

export const SampleImage: React.FC<Props> = ({
  image,
  thumbnail,
  name,
  setBlob,
  setImageFileId,
  setIsImageLoading,
}: Props) => {
  const handleCardClick = async () => {
    setIsImageLoading(name, true);
    const response: Response = await fetch(image);
    const blob: Blob = await response.blob();
    setBlob(blob);
    setImageFileId(undefined);
    setIsImageLoading(name, false);
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
