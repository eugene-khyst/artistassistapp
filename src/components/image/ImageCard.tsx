/**
 * Copyright 2023 Eugene Khyst
 * SPDX-License-Identifier: Apache-2.0
 */

import {Card} from 'antd';
import type {CardMetaProps, CardProps} from 'antd/es/card';
import type {ForwardedRef, HTMLAttributes} from 'react';
import {forwardRef} from 'react';

import {useCreateObjectUrl} from '~/src/hooks/useCreateObjectUrl';

type Props = {
  file: File;
} & Pick<CardMetaProps, 'description'> &
  Pick<CardProps, 'hoverable'> &
  Pick<HTMLAttributes<HTMLDivElement>, 'onClick'>;

export const ImageCard = forwardRef<HTMLDivElement, Props>(function ImageCard(
  {file, description, hoverable, onClick}: Props,
  ref: ForwardedRef<HTMLDivElement>
) {
  const imageSrc: string | undefined = useCreateObjectUrl(file);
  return (
    imageSrc && (
      <Card
        ref={ref}
        hoverable={hoverable}
        onClick={onClick}
        cover={<img src={imageSrc} alt={file.name} />}
      >
        <Card.Meta title={file.name} description={description} />
      </Card>
    )
  );
});
