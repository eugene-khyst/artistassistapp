/**
 * ArtistAssistApp
 * Copyright (C) 2023-2025  Eugene Khyst
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
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
  const imageUrl: string | undefined = useCreateObjectUrl(file);
  return (
    imageUrl && (
      <Card
        ref={ref}
        hoverable={hoverable}
        onClick={onClick}
        cover={<img src={imageUrl} alt={file.name} />}
      >
        <Card.Meta title={file.name} description={description} />
      </Card>
    )
  );
});
